import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import {
  and,
  avg,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  availabilityBlocks,
  bookings,
  bookingStatusLogs,
  driverDocuments,
  driverProfiles,
  notifications,
  passwordResetTokens,
  payments,
  platformSettings,
  reviews,
  transactions,
  users,
  vehicleImages,
  vehicleOwners,
  vehicles,
} from './src/db/schema.ts';
import {
  getOrCreateFirebaseUser,
  hashPassword,
  requireAuth,
  requireRole,
  signSessionToken,
  verifyPassword,
  type AuthRequest,
} from './src/server/auth.ts';
import {
  checkAvailabilityConflicts,
  createTransactionalBooking,
  finalizePaidBookingIdempotent,
} from './src/server/bookings.ts';
import {
  calculateBookingPricing,
  getCommissionRatePct,
  type DurationUnit,
  type RentalOption,
  type ServiceType,
} from './src/server/pricing.ts';
import { ensureSeeded } from './src/server/seed.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Capture rawBody for Paystack HMAC-SHA512 webhook signature verification
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);

// Lazily seed demo Nigerian marketplace data on first API request
app.use('/api', async (_req, _res, next) => {
  try {
    await ensureSeeded();
  } catch (err) {
    console.error('Lazy seed check error:', err);
  }
  next();
});

// ---------------- HEALTH & CONFIG ----------------

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'prodrivers-api' });
});

app.get('/api/config', async (_req, res) => {
  const commissionRatePct = await getCommissionRatePct();
  res.json({
    paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY),
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    mapsApiKeyConfigured: Boolean(process.env.VITE_GOOGLE_MAPS_API_KEY),
    commissionRatePct,
    currency: 'NGN',
  });
});

// ---------------- AUTHENTICATION ----------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      phone,
      role = 'CUSTOMER',
      location = 'Victoria Island, Lagos',
      companyName,
      yearsExperience = 5,
    } = req.body ?? {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters.' });
    }
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    const allowedRoles = ['CUSTOMER', 'DRIVER', 'VEHICLE_OWNER'];
    const targetRole = allowedRoles.includes(role) ? role : 'CUSTOMER';
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return res
        .status(409)
        .json({ error: 'An account with this email already exists.' });
    }

    const createdUser = await db.transaction(async (tx) => {
      const uid = `local_${crypto.randomUUID()}`;
      const [user] = await tx
        .insert(users)
        .values({
          uid,
          email: normalizedEmail,
          fullName: fullName.trim(),
          phone: typeof phone === 'string' ? phone.trim() : null,
          passwordHash: hashPassword(password),
          role: targetRole,
        })
        .returning();

      if (targetRole === 'DRIVER') {
        await tx.insert(driverProfiles).values({
          userId: user.id,
          fullName: user.fullName,
          photoUrl: '/src/assets/images/driver_chinedu_okafor_1795309128141.jpg',
          location: String(location || 'Lagos'),
          serviceAreas: [String(location || 'Victoria Island'), 'Ikoyi', 'Lekki Phase 1'],
          yearsExperience: Math.max(1, Number(yearsExperience) || 3),
          bio: 'Newly registered professional driver on ProDrivers. Update your biography and upload verification documents to start receiving confirmed bookings.',
          categories: ['Executive Chauffeur', 'Corporate Fleet'],
          languages: ['English'],
          hourlyRateNgn: 3500,
          dailyRateNgn: 22000,
          weeklyRateNgn: 130000,
          monthlyRateNgn: 450000,
          verificationStatus: 'PENDING',
          availabilityStatus: 'AVAILABLE',
        });
      }

      if (targetRole === 'VEHICLE_OWNER') {
        await tx.insert(vehicleOwners).values({
          userId: user.id,
          companyName:
            typeof companyName === 'string' && companyName.trim()
              ? companyName.trim()
              : `${user.fullName} Fleet`,
          location: String(location || 'Lagos'),
          contactPhone: typeof phone === 'string' && phone.trim() ? phone.trim() : '+234 800 000 0000',
          verificationStatus: 'VERIFIED',
        });
      }

      return user;
    });

    const token = signSessionToken({
      id: createdUser.id,
      uid: createdUser.uid,
      email: createdUser.email,
      role: createdUser.role,
    });

    res.status(201).json({
      token,
      user: {
        id: createdUser.id,
        uid: createdUser.uid,
        email: createdUser.email,
        fullName: createdUser.fullName,
        phone: createdUser.phone,
        role: createdUser.role,
        avatarUrl: createdUser.avatarUrl,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Unable to complete registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated.' });
    }

    const token = signSessionToken({
      id: user.id,
      uid: user.uid,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Unable to sign in.' });
  }
});

app.post('/api/auth/firebase-sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const requestedRole = req.body?.role;
    const authUser = req.authUser!;

    // Optionally initialize driver or owner profile if newly registering via Google with a role
    if (requestedRole === 'DRIVER' && authUser.role === 'CUSTOMER') {
      const existingDriver = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, authUser.id))
        .limit(1);
      if (existingDriver.length === 0) {
        await db.transaction(async (tx) => {
          await tx
            .update(users)
            .set({ role: 'DRIVER' })
            .where(eq(users.id, authUser.id));
          await tx.insert(driverProfiles).values({
            userId: authUser.id,
            fullName: authUser.fullName,
            photoUrl:
              authUser.avatarUrl ||
              '/src/assets/images/driver_chinedu_okafor_1795309128141.jpg',
            location: 'Victoria Island, Lagos',
            serviceAreas: ['Victoria Island', 'Ikoyi', 'Lekki Phase 1'],
            yearsExperience: 3,
            bio: 'Professional driver registered via Google Sign-In.',
            categories: ['Executive Chauffeur'],
            languages: ['English'],
            hourlyRateNgn: 3500,
            dailyRateNgn: 22000,
            weeklyRateNgn: 130000,
            monthlyRateNgn: 450000,
            verificationStatus: 'PENDING',
          });
        });
        authUser.role = 'DRIVER';
      }
    } else if (requestedRole === 'VEHICLE_OWNER' && authUser.role === 'CUSTOMER') {
      const existingOwner = await db
        .select()
        .from(vehicleOwners)
        .where(eq(vehicleOwners.userId, authUser.id))
        .limit(1);
      if (existingOwner.length === 0) {
        await db.transaction(async (tx) => {
          await tx
            .update(users)
            .set({ role: 'VEHICLE_OWNER' })
            .where(eq(users.id, authUser.id));
          await tx.insert(vehicleOwners).values({
            userId: authUser.id,
            companyName: `${authUser.fullName} Fleet`,
            location: 'Lagos',
            contactPhone: authUser.phone || '+234 800 000 0000',
          });
        });
        authUser.role = 'VEHICLE_OWNER';
      }
    }

    res.json({ user: authUser });
  } catch (err) {
    console.error('Firebase sync error:', err);
    res.status(500).json({ error: 'Unable to synchronize user session.' });
  }
});

app.post('/api/auth/password-reset/request', async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // Always return generic confirmation so account existence is not leaked
    if (!user) {
      return res.json({
        message:
          'If an account exists for that email, a password reset code has been generated.',
      });
    }

    const rawToken = crypto.randomBytes(4).toString('hex').toUpperCase();
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    res.json({
      message:
        'Password reset instructions generated. Configure an SMTP email provider in production to deliver reset codes automatically.',
      // Preview notice only when SMTP is not configured; never returned for admin accounts
      previewResetAvailable: user.role !== 'ADMIN' && !process.env.SMTP_HOST,
      previewCode:
        user.role !== 'ADMIN' && !process.env.SMTP_HOST ? rawToken : undefined,
    });
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({ error: 'Unable to process reset request.' });
  }
});

app.post('/api/auth/password-reset/confirm', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body ?? {};
    if (
      !email ||
      !code ||
      !newPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        error: 'Email, reset code, and a new password (8+ chars) are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(String(code).trim().toUpperCase())
      .digest('hex');

    const [tokenRow] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          eq(passwordResetTokens.tokenHash, tokenHash)
        )
      )
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1);

    if (
      !tokenRow ||
      tokenRow.usedAt !== null ||
      tokenRow.expiresAt.getTime() < Date.now()
    ) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash: hashPassword(newPassword) })
        .where(eq(users.id, user.id));
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, tokenRow.id));
    });

    res.json({ message: 'Password has been updated. You can now sign in.' });
  } catch (err) {
    console.error('Password reset confirm error:', err);
    res.status(500).json({ error: 'Unable to reset password.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.authUser!;
    const [driver] = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, authUser.id))
      .limit(1);
    const [owner] = await db
      .select()
      .from(vehicleOwners)
      .where(eq(vehicleOwners.userId, authUser.id))
      .limit(1);

    res.json({
      user: authUser,
      driverProfile: driver || null,
      vehicleOwner: owner || null,
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Unable to load profile.' });
  }
});

app.patch('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { fullName, phone } = req.body ?? {};
    const [updated] = await db
      .update(users)
      .set({
        fullName:
          typeof fullName === 'string' && fullName.trim().length >= 2
            ? fullName.trim()
            : req.authUser!.fullName,
        phone: typeof phone === 'string' ? phone.trim() : req.authUser!.phone,
      })
      .where(eq(users.id, req.authUser!.id))
      .returning();

    res.json({
      user: {
        id: updated.id,
        uid: updated.uid,
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone,
        role: updated.role,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Unable to update profile.' });
  }
});

// ---------------- PUBLIC MARKETPLACE: DRIVERS ----------------

app.get('/api/drivers', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const location = String(req.query.location || '').trim();
    const availability = String(req.query.availability || '').trim();
    const minExp = Number(req.query.minExp || 0);
    const maxPrice = Number(req.query.maxPrice || 0);
    const category = String(req.query.category || '').trim();

    const conditions = [eq(driverProfiles.verificationStatus, 'VERIFIED')];

    if (q) {
      conditions.push(
        or(
          ilike(driverProfiles.fullName, `%${q}%`),
          ilike(driverProfiles.location, `%${q}%`),
          ilike(driverProfiles.bio, `%${q}%`)
        )!
      );
    }
    if (location && location !== 'ALL') {
      conditions.push(ilike(driverProfiles.location, `%${location}%`));
    }
    if (availability && availability !== 'ALL') {
      conditions.push(eq(driverProfiles.availabilityStatus, availability));
    }
    if (minExp > 0) {
      conditions.push(gte(driverProfiles.yearsExperience, minExp));
    }
    if (maxPrice > 0) {
      conditions.push(lte(driverProfiles.dailyRateNgn, maxPrice));
    }

    let rows = await db
      .select()
      .from(driverProfiles)
      .where(and(...conditions))
      .orderBy(desc(driverProfiles.ratingAvg));

    if (category && category !== 'ALL') {
      rows = rows.filter((d) =>
        d.categories.some((c) => c.toLowerCase().includes(category.toLowerCase()))
      );
    }

    res.json({ drivers: rows });
  } catch (err) {
    console.error('List drivers error:', err);
    res.status(500).json({ error: 'Unable to load drivers.' });
  }
});

app.get('/api/drivers/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid driver ID.' });
    }

    const [driver] = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.id, id))
      .limit(1);

    if (!driver || driver.verificationStatus !== 'VERIFIED') {
      return res.status(404).json({ error: 'Driver profile not found.' });
    }

    const docs = await db
      .select({
        id: driverDocuments.id,
        docType: driverDocuments.docType,
        status: driverDocuments.status,
        verifiedAt: driverDocuments.verifiedAt,
      })
      .from(driverDocuments)
      .where(
        and(
          eq(driverDocuments.driverId, driver.id),
          eq(driverDocuments.status, 'VERIFIED')
        )
      );

    const driverReviews = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        isDemo: reviews.isDemo,
        createdAt: reviews.createdAt,
        customerName: users.fullName,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.customerId, users.id))
      .where(eq(reviews.driverId, driver.id))
      .orderBy(desc(reviews.createdAt));

    const bookedRanges = await db
      .select({
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.driverId, driver.id),
          inArray(bookings.status, ['CONFIRMED', 'IN_PROGRESS', 'AWAITING_PAYMENT'])
        )
      );

    const blockedRanges = await db
      .select({
        startDate: availabilityBlocks.startDate,
        endDate: availabilityBlocks.endDate,
        reason: availabilityBlocks.reason,
      })
      .from(availabilityBlocks)
      .where(
        and(
          eq(availabilityBlocks.targetType, 'DRIVER'),
          eq(availabilityBlocks.targetId, driver.id)
        )
      );

    res.json({
      driver,
      verifiedDocuments: docs,
      reviews: driverReviews,
      unavailableWindows: [...bookedRanges, ...blockedRanges],
    });
  } catch (err) {
    console.error('Get driver profile error:', err);
    res.status(500).json({ error: 'Unable to load driver profile.' });
  }
});

// ---------------- PUBLIC MARKETPLACE: VEHICLES ----------------

app.get('/api/cars', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const location = String(req.query.location || '').trim();
    const category = String(req.query.category || '').trim();
    const transmission = String(req.query.transmission || '').trim();
    const minSeats = Number(req.query.minSeats || 0);
    const maxPrice = Number(req.query.maxPrice || 0);
    const rentalOption = String(req.query.rentalOption || '').trim();

    const conditions = [eq(vehicles.approvalStatus, 'APPROVED')];

    if (q) {
      conditions.push(
        or(
          ilike(vehicles.make, `%${q}%`),
          ilike(vehicles.model, `%${q}%`),
          ilike(vehicles.location, `%${q}%`)
        )!
      );
    }
    if (location && location !== 'ALL') {
      conditions.push(ilike(vehicles.location, `%${location}%`));
    }
    if (category && category !== 'ALL') {
      conditions.push(eq(vehicles.category, category.toUpperCase()));
    }
    if (transmission && transmission !== 'ALL') {
      conditions.push(eq(vehicles.transmission, transmission.toUpperCase()));
    }
    if (minSeats > 0) {
      conditions.push(gte(vehicles.seats, minSeats));
    }
    if (maxPrice > 0) {
      conditions.push(lte(vehicles.dailyRateNgn, maxPrice));
    }
    if (rentalOption === 'SELF_DRIVE') {
      conditions.push(eq(vehicles.allowsSelfDrive, true));
    } else if (rentalOption === 'CHAUFFEUR') {
      conditions.push(eq(vehicles.allowsChauffeur, true));
    }

    const rows = await db
      .select({
        vehicle: vehicles,
        ownerCompany: vehicleOwners.companyName,
      })
      .from(vehicles)
      .innerJoin(vehicleOwners, eq(vehicles.ownerId, vehicleOwners.id))
      .where(and(...conditions))
      .orderBy(desc(vehicles.createdAt));

    res.json({
      cars: rows.map((r) => ({
        ...r.vehicle,
        ownerCompany: r.ownerCompany,
      })),
    });
  } catch (err) {
    console.error('List cars error:', err);
    res.status(500).json({ error: 'Unable to load vehicles.' });
  }
});

app.get('/api/cars/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid vehicle ID.' });
    }

    const rows = await db
      .select({
        vehicle: vehicles,
        ownerCompany: vehicleOwners.companyName,
        ownerLocation: vehicleOwners.location,
      })
      .from(vehicles)
      .innerJoin(vehicleOwners, eq(vehicles.ownerId, vehicleOwners.id))
      .where(eq(vehicles.id, id))
      .limit(1);

    if (rows.length === 0 || rows[0].vehicle.approvalStatus !== 'APPROVED') {
      return res.status(404).json({ error: 'Vehicle listing not found.' });
    }

    const gallery = await db
      .select()
      .from(vehicleImages)
      .where(eq(vehicleImages.vehicleId, id));

    const carReviews = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        isDemo: reviews.isDemo,
        createdAt: reviews.createdAt,
        customerName: users.fullName,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.customerId, users.id))
      .where(eq(reviews.vehicleId, id))
      .orderBy(desc(reviews.createdAt));

    const bookedRanges = await db
      .select({
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.vehicleId, id),
          inArray(bookings.status, ['CONFIRMED', 'IN_PROGRESS', 'AWAITING_PAYMENT'])
        )
      );

    const blockedRanges = await db
      .select({
        startDate: availabilityBlocks.startDate,
        endDate: availabilityBlocks.endDate,
        reason: availabilityBlocks.reason,
      })
      .from(availabilityBlocks)
      .where(
        and(
          eq(availabilityBlocks.targetType, 'VEHICLE'),
          eq(availabilityBlocks.targetId, id)
        )
      );

    res.json({
      car: {
        ...rows[0].vehicle,
        ownerCompany: rows[0].ownerCompany,
        ownerLocation: rows[0].ownerLocation,
      },
      images: gallery,
      reviews: carReviews,
      unavailableWindows: [...bookedRanges, ...blockedRanges],
    });
  } catch (err) {
    console.error('Get car error:', err);
    res.status(500).json({ error: 'Unable to load vehicle details.' });
  }
});

// ---------------- SERVER-SIDE PRICING QUOTE ----------------

app.post('/api/pricing/quote', async (req, res) => {
  try {
    const {
      driverId,
      vehicleId,
      serviceType = 'DRIVER_HIRE',
      rentalOption = 'CHAUFFEUR',
      durationUnit = 'DAILY',
      durationCount = 1,
    } = req.body ?? {};

    const quote = await calculateBookingPricing({
      driverId: driverId ? Number(driverId) : null,
      vehicleId: vehicleId ? Number(vehicleId) : null,
      serviceType: serviceType as ServiceType,
      rentalOption: rentalOption as RentalOption,
      durationUnit: durationUnit as DurationUnit,
      durationCount: Number(durationCount) || 1,
    });

    res.json({ quote });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unable to calculate quote.';
    res.status(400).json({ error: msg });
  }
});

// ---------------- BOOKINGS ----------------

app.post('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      driverId,
      vehicleId,
      serviceType = 'DRIVER_HIRE',
      rentalOption = 'CHAUFFEUR',
      durationUnit = 'DAILY',
      durationCount = 1,
      startDateIso,
      pickupLocation,
      destination,
      customerName,
      customerPhone,
      customerEmail,
      notes,
    } = req.body ?? {};

    if (!startDateIso || !pickupLocation || !customerName || !customerPhone || !customerEmail) {
      return res.status(400).json({
        error: 'Pickup date, pickup location, and customer contact details are required.',
      });
    }

    const result = await createTransactionalBooking({
      customerId: req.authUser!.id,
      driverId: driverId ? Number(driverId) : null,
      vehicleId: vehicleId ? Number(vehicleId) : null,
      serviceType: serviceType as ServiceType,
      rentalOption: rentalOption as RentalOption,
      durationUnit: durationUnit as DurationUnit,
      durationCount: Math.max(1, Number(durationCount) || 1),
      startDateIso: String(startDateIso),
      pickupLocation: String(pickupLocation),
      destination: destination ? String(destination) : undefined,
      customerName: String(customerName),
      customerPhone: String(customerPhone),
      customerEmail: String(customerEmail),
      notes: notes ? String(notes) : undefined,
    });

    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create booking.';
    const status = message.includes('already') || message.includes('unavailable') ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

app.get('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const rows = await db
      .select({
        booking: bookings,
        driverName: driverProfiles.fullName,
        driverPhoto: driverProfiles.photoUrl,
        vehicleMake: vehicles.make,
        vehicleModel: vehicles.model,
        vehicleYear: vehicles.year,
        vehicleImage: vehicles.primaryImageUrl,
        reviewId: reviews.id,
      })
      .from(bookings)
      .leftJoin(driverProfiles, eq(bookings.driverId, driverProfiles.id))
      .leftJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .leftJoin(reviews, eq(bookings.id, reviews.bookingId))
      .where(eq(bookings.customerId, user.id))
      .orderBy(desc(bookings.createdAt));

    res.json({
      bookings: rows.map((r) => ({
        ...r.booking,
        driverName: r.driverName,
        driverPhoto: r.driverPhoto,
        vehicleName: r.vehicleMake
          ? `${r.vehicleYear} ${r.vehicleMake} ${r.vehicleModel}`
          : null,
        vehicleImage: r.vehicleImage,
        hasReview: Boolean(r.reviewId),
      })),
    });
  } catch (err) {
    console.error('List customer bookings error:', err);
    res.status(500).json({ error: 'Unable to load bookings.' });
  }
});

app.get('/api/bookings/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid booking ID.' });
    }

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Strict ownership check
    const user = req.authUser!;
    let authorized = user.role === 'ADMIN' || booking.customerId === user.id;

    if (!authorized && booking.driverId) {
      const [driver] = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.id, booking.driverId))
        .limit(1);
      if (driver && driver.userId === user.id) authorized = true;
    }

    if (!authorized && booking.vehicleId) {
      const [vehicle] = await db
        .select({ ownerUserId: vehicleOwners.userId })
        .from(vehicles)
        .innerJoin(vehicleOwners, eq(vehicles.ownerId, vehicleOwners.id))
        .where(eq(vehicles.id, booking.vehicleId))
        .limit(1);
      if (vehicle && vehicle.ownerUserId === user.id) authorized = true;
    }

    if (!authorized) {
      return res.status(403).json({ error: 'Access denied for this booking.' });
    }

    const logs = await db
      .select()
      .from(bookingStatusLogs)
      .where(eq(bookingStatusLogs.bookingId, booking.id))
      .orderBy(desc(bookingStatusLogs.createdAt));

    const bookingPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, booking.id))
      .orderBy(desc(payments.createdAt));

    res.json({ booking, statusLogs: logs, payments: bookingPayments });
  } catch (err) {
    console.error('Get booking detail error:', err);
    res.status(500).json({ error: 'Unable to load booking.' });
  }
});

app.post('/api/bookings/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking || booking.customerId !== req.authUser!.id) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (!['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(booking.status)) {
      return res.status(400).json({
        error: `Bookings in ${booking.status} status cannot be cancelled.`,
      });
    }

    const updated = await db.transaction(async (tx) => {
      const nextStatus = booking.status === 'CONFIRMED' ? 'REFUNDED' : 'CANCELLED';
      const [row] = await tx
        .update(bookings)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(eq(bookings.id, booking.id))
        .returning();

      await tx.insert(bookingStatusLogs).values({
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: nextStatus,
        changedByUserId: req.authUser!.id,
        note:
          nextStatus === 'REFUNDED'
            ? 'Cancelled by customer; refund initiated.'
            : 'Cancelled by customer prior to payment.',
      });

      if (nextStatus === 'REFUNDED') {
        await tx
          .update(payments)
          .set({ status: 'REFUNDED' })
          .where(eq(payments.bookingId, booking.id));

        await tx.insert(transactions).values({
          bookingId: booking.id,
          userId: booking.customerId,
          type: 'REFUND',
          amountNgn: booking.totalAmountNgn,
          status: 'RECORDED',
          reference: `REF-${booking.bookingCode}`,
          description: `Refund recorded for cancelled booking ${booking.bookingCode}`,
        });
      }

      return row;
    });

    res.json({ booking: updated });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Unable to cancel booking.' });
  }
});

app.post('/api/bookings/:id/dispute', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 5) {
      return res.status(400).json({ error: 'Please describe the issue.' });
    }

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking || booking.customerId !== req.authUser!.id) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const [updated] = await db
      .update(bookings)
      .set({
        disputeStatus: 'OPEN',
        disputeReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))
      .returning();

    res.json({ booking: updated });
  } catch (err) {
    console.error('Open dispute error:', err);
    res.status(500).json({ error: 'Unable to submit dispute.' });
  }
});

app.post('/api/bookings/:id/review', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const rating = Math.min(5, Math.max(1, Number(req.body?.rating || 5)));
    const comment = String(req.body?.comment || '').trim();

    if (comment.length < 4) {
      return res.status(400).json({ error: 'Please enter a short review comment.' });
    }

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking || booking.customerId !== req.authUser!.id) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (booking.status !== 'COMPLETED') {
      return res
        .status(400)
        .json({ error: 'You can review a booking once it is completed.' });
    }

    const existing = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.bookingId, booking.id))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this trip.' });
    }

    const created = await db.transaction(async (tx) => {
      const [reviewRow] = await tx
        .insert(reviews)
        .values({
          bookingId: booking.id,
          customerId: req.authUser!.id,
          driverId: booking.driverId,
          vehicleId: booking.vehicleId,
          rating,
          comment,
          isDemo: false,
        })
        .returning();

      if (booking.driverId) {
        const [agg] = await tx
          .select({ average: avg(reviews.rating) })
          .from(reviews)
          .where(eq(reviews.driverId, booking.driverId));
        if (agg?.average) {
          await tx
            .update(driverProfiles)
            .set({ ratingAvg: Number(agg.average).toFixed(2) })
            .where(eq(driverProfiles.id, booking.driverId));
        }
      }

      return reviewRow;
    });

    res.status(201).json({ review: created });
  } catch (err) {
    console.error('Review submission error:', err);
    res.status(500).json({ error: 'Unable to submit review.' });
  }
});

// ---------------- PAYSTACK PAYMENTS ----------------

app.post('/api/payments/initialize', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookingId = Number(req.body?.bookingId);
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking || booking.customerId !== req.authUser!.id) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (booking.status !== 'AWAITING_PAYMENT' && booking.status !== 'PENDING') {
      return res
        .status(400)
        .json({ error: 'This booking is no longer awaiting payment.' });
    }

    const reference = `PSK_${booking.bookingCode}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    await db.insert(payments).values({
      bookingId: booking.id,
      reference,
      provider: 'PAYSTACK',
      amountNgn: booking.totalAmountNgn,
      currency: 'NGN',
      status: 'PENDING',
    });

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      return res.json({
        mode: 'SANDBOX_UNCONFIGURED',
        reference,
        amountNgn: booking.totalAmountNgn,
        message:
          'PAYSTACK_SECRET_KEY is not configured in server environment. Use the test-mode simulation below or configure PAYSTACK_SECRET_KEY in Secrets to launch live Paystack test checkout.',
      });
    }

    const appUrl =
      process.env.APP_URL ||
      `${req.protocol}://${req.get('host')}`;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: booking.customerEmail,
        amount: booking.totalAmountNgn * 100, // Kobo
        reference,
        currency: 'NGN',
        callback_url: `${appUrl}/dashboard?verify_ref=${encodeURIComponent(reference)}`,
        metadata: {
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
        },
      }),
    });

    const data = (await paystackRes.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; access_code?: string; reference?: string };
    };

    if (!paystackRes.ok || !data.status || !data.data?.authorization_url) {
      return res.status(502).json({
        error: data.message || 'Paystack initialization failed.',
      });
    }

    res.json({
      mode: 'PAYSTACK_LIVE_TEST',
      reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      amountNgn: booking.totalAmountNgn,
    });
  } catch (err) {
    console.error('Payment init error:', err);
    res.status(500).json({ error: 'Unable to initialize payment.' });
  }
});

app.post('/api/payments/verify', requireAuth, async (req: AuthRequest, res) => {
  try {
    const reference = String(req.body?.reference || '').trim();
    const sandboxConfirm = Boolean(req.body?.sandboxConfirm);

    if (!reference) {
      return res.status(400).json({ error: 'Payment reference is required.' });
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.reference, reference))
      .limit(1);

    if (!payment) {
      return res.status(404).json({ error: 'Payment reference not found.' });
    }

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId))
      .limit(1);

    if (!booking || (booking.customerId !== req.authUser!.id && req.authUser!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized payment verification.' });
    }

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackKey) {
      if (!sandboxConfirm) {
        return res.status(400).json({
          error: 'PAYSTACK_SECRET_KEY is not configured for live verification.',
        });
      }
      const finalized = await finalizePaidBookingIdempotent({
        reference,
        channel: 'paystack_test_sandbox',
        providerPayload: {
          mode: 'local_test_sandbox',
          verifiedAt: new Date().toISOString(),
        },
        actorUserId: req.authUser!.id,
      });
      return res.json(finalized);
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackKey}`,
        },
      }
    );

    const payload = (await verifyRes.json()) as {
      status?: boolean;
      data?: { status?: string; amount?: number; channel?: string; currency?: string };
    };

    if (
      !verifyRes.ok ||
      !payload.status ||
      payload.data?.status !== 'success' ||
      Number(payload.data?.amount) < payment.amountNgn * 100
    ) {
      return res.status(400).json({
        error: 'Paystack transaction has not succeeded or amount mismatch.',
      });
    }

    const finalized = await finalizePaidBookingIdempotent({
      reference,
      channel: payload.data.channel || 'paystack',
      providerPayload: payload.data,
      actorUserId: req.authUser!.id,
    });

    res.json(finalized);
  } catch (err) {
    console.error('Payment verify error:', err);
    res.status(500).json({ error: 'Unable to verify payment.' });
  }
});

app.post('/api/payments/webhook/paystack', async (req, res) => {
  try {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      return res.status(503).json({ error: 'Paystack secret key not configured.' });
    }

    const signature = req.headers['x-paystack-signature'];
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

    if (typeof signature !== 'string' || !rawBody) {
      return res.status(401).json({ error: 'Missing webhook signature.' });
    }

    const computed = crypto
      .createHmac('sha512', paystackKey)
      .update(rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(signature);
    const compBuf = Buffer.from(computed);
    if (sigBuf.length !== compBuf.length || !crypto.timingSafeEqual(sigBuf, compBuf)) {
      return res.status(401).json({ error: 'Invalid Paystack signature.' });
    }

    const event = req.body as {
      event?: string;
      data?: { reference?: string; channel?: string; amount?: number };
    };

    if (event.event === 'charge.success' && event.data?.reference) {
      await finalizePaidBookingIdempotent({
        reference: event.data.reference,
        channel: event.data.channel || 'paystack_webhook',
        providerPayload: event.data,
      });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Paystack webhook error:', err);
    res.status(500).json({ error: 'Webhook processing error.' });
  }
});

app.get('/api/payments/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({
        payment: payments,
        bookingCode: bookings.bookingCode,
        serviceType: bookings.serviceType,
        pickupLocation: bookings.pickupLocation,
      })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(eq(bookings.customerId, req.authUser!.id))
      .orderBy(desc(payments.createdAt));

    res.json({
      payments: rows.map((r) => ({
        ...r.payment,
        bookingCode: r.bookingCode,
        serviceType: r.serviceType,
        pickupLocation: r.pickupLocation,
      })),
    });
  } catch (err) {
    console.error('List my payments error:', err);
    res.status(500).json({ error: 'Unable to load payment history.' });
  }
});

// ---------------- DRIVER DASHBOARD ----------------

app.get(
  '/api/driver/me',
  requireAuth,
  requireRole('DRIVER', 'ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const [profile] = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, req.authUser!.id))
        .limit(1);

      if (!profile) {
        return res.status(404).json({ error: 'Driver profile not found.' });
      }

      const docs = await db
        .select()
        .from(driverDocuments)
        .where(eq(driverDocuments.driverId, profile.id))
        .orderBy(desc(driverDocuments.createdAt));

      const driverBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.driverId, profile.id))
        .orderBy(desc(bookings.createdAt));

      const blocks = await db
        .select()
        .from(availabilityBlocks)
        .where(
          and(
            eq(availabilityBlocks.targetType, 'DRIVER'),
            eq(availabilityBlocks.targetId, profile.id)
          )
        )
        .orderBy(desc(availabilityBlocks.startDate));

      const completedEarningsNgn = driverBookings
        .filter((b) => b.status === 'COMPLETED' || b.status === 'CONFIRMED')
        .reduce((sum, b) => sum + b.subtotalNgn, 0);

      res.json({
        profile,
        documents: docs,
        bookings: driverBookings,
        availabilityBlocks: blocks,
        earningsNgn: completedEarningsNgn,
      });
    } catch (err) {
      console.error('Driver dashboard error:', err);
      res.status(500).json({ error: 'Unable to load driver dashboard.' });
    }
  }
);

app.patch(
  '/api/driver/profile',
  requireAuth,
  requireRole('DRIVER', 'ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const [profile] = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, req.authUser!.id))
        .limit(1);

      if (!profile) {
        return res.status(404).json({ error: 'Driver profile not found.' });
      }

      const {
        bio,
        location,
        serviceAreas,
        categories,
        languages,
        hourlyRateNgn,
        dailyRateNgn,
        weeklyRateNgn,
        monthlyRateNgn,
        availabilityStatus,
      } = req.body ?? {};

      const [updated] = await db
        .update(driverProfiles)
        .set({
          bio: typeof bio === 'string' && bio.trim() ? bio.trim() : profile.bio,
          location:
            typeof location === 'string' && location.trim()
              ? location.trim()
              : profile.location,
          serviceAreas: Array.isArray(serviceAreas)
            ? serviceAreas
            : profile.serviceAreas,
          categories: Array.isArray(categories) ? categories : profile.categories,
          languages: Array.isArray(languages) ? languages : profile.languages,
          hourlyRateNgn:
            Number(hourlyRateNgn) > 0 ? Number(hourlyRateNgn) : profile.hourlyRateNgn,
          dailyRateNgn:
            Number(dailyRateNgn) > 0 ? Number(dailyRateNgn) : profile.dailyRateNgn,
          weeklyRateNgn:
            Number(weeklyRateNgn) > 0 ? Number(weeklyRateNgn) : profile.weeklyRateNgn,
          monthlyRateNgn:
            Number(monthlyRateNgn) > 0 ? Number(monthlyRateNgn) : profile.monthlyRateNgn,
          availabilityStatus: ['AVAILABLE', 'BUSY', 'OFFLINE'].includes(
            availabilityStatus
          )
            ? availabilityStatus
            : profile.availabilityStatus,
        })
        .where(eq(driverProfiles.id, profile.id))
        .returning();

      res.json({ profile: updated });
    } catch (err) {
      console.error('Update driver profile error:', err);
      res.status(500).json({ error: 'Unable to update driver profile.' });
    }
  }
);

app.post(
  '/api/driver/documents',
  requireAuth,
  requireRole('DRIVER', 'ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const [profile] = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, req.authUser!.id))
        .limit(1);

      if (!profile) {
        return res.status(404).json({ error: 'Driver profile not found.' });
      }

      const { docType, documentNumber } = req.body ?? {};
      if (!docType || !documentNumber || String(documentNumber).trim().length < 4) {
        return res
          .status(400)
          .json({ error: 'Document type and valid document number are required.' });
      }

      const [doc] = await db
        .insert(driverDocuments)
        .values({
          driverId: profile.id,
          docType: String(docType),
          documentNumber: String(documentNumber).trim(),
          status: 'PENDING',
        })
        .returning();

      res.status(201).json({ document: doc });
    } catch (err) {
      console.error('Upload driver doc error:', err);
      res.status(500).json({ error: 'Unable to submit verification document.' });
    }
  }
);

app.post(
  '/api/driver/availability',
  requireAuth,
  requireRole('DRIVER', 'ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const [profile] = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, req.authUser!.id))
        .limit(1);

      if (!profile) {
        return res.status(404).json({ error: 'Driver profile not found.' });
      }

      const { startDate, endDate, reason = 'Personal Unavailable' } = req.body ?? {};
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return res.status(400).json({ error: 'Valid start and end dates required.' });
      }

      const [block] = await db
        .insert(availabilityBlocks)
        .values({
          targetType: 'DRIVER',
          targetId: profile.id,
          startDate: start,
          endDate: end,
          reason: String(reason),
        })
        .returning();

      res.status(201).json({ block });
    } catch (err) {
      console.error('Driver availability block error:', err);
      res.status(500).json({ error: 'Unable to save availability block.' });
    }
  }
);

app.post(
  '/api/driver/bookings/:id/decision',
  requireAuth,
  requireRole('DRIVER', 'ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const bookingId = Number(req.params.id);
      const decision = String(req.body?.decision || '').toUpperCase();
      if (!['ACCEPTED', 'REJECTED'].includes(decision)) {
        return res.status(400).json({ error: 'Decision must be ACCEPTED or REJECTED.' });
      }

      const [profile] = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, req.authUser!.id))
        .limit(1);

      if (!profile) {
        return res.status(404).json({ error: 'Driver profile not found.' });
      }

      if (decision === 'ACCEPTED' && profile.verificationStatus !== 'VERIFIED') {
        return res.status(403).json({
          error: 'Only verified drivers can accept confirmed bookings.',
        });
      }

      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (!booking || booking.driverId !== profile.id) {
        return res.status(404).json({ error: 'Booking not found.' });
      }

      if (decision === 'ACCEPTED') {
        const conflict = await checkAvailabilityConflicts({
          driverId: profile.id,
          startDate: booking.startDate,
          endDate: booking.endDate,
          excludeBookingId: booking.id,
        });
        if (conflict) {
          return res.status(409).json({ error: conflict });
        }
      }

      const nextStatus =
        decision === 'REJECTED' ? 'CANCELLED' : booking.status;

      const [updated] = await db
        .update(bookings)
        .set({
          driverDecision: decision,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id))
        .returning();

      await db.insert(bookingStatusLogs).values({
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: nextStatus,
        changedByUserId: req.authUser!.id,
        note: `Driver ${decision.toLowerCase()} booking request.`,
      });

      res.json({ booking: updated });
    } catch (err) {
      console.error('Driver decision error:', err);
      res.status(500).json({ error: 'Unable to update booking decision.' });
    }
  }
);

app.post(
  '/api/driver/bookings/:id/status',
  requireAuth,
  requireRole('DRIVER', 'ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const bookingId = Number(req.params.id);
      const nextStatus = String(req.body?.status || '').toUpperCase();
      if (!['IN_PROGRESS', 'COMPLETED'].includes(nextStatus)) {
        return res
          .status(400)
          .json({ error: 'Driver can transition trips to IN_PROGRESS or COMPLETED.' });
      }

      const [profile] = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, req.authUser!.id))
        .limit(1);

      if (!profile) {
        return res.status(404).json({ error: 'Driver profile not found.' });
      }

      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (!booking || booking.driverId !== profile.id) {
        return res.status(404).json({ error: 'Booking not found.' });
      }

      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx
          .update(bookings)
          .set({ status: nextStatus, updatedAt: new Date() })
          .where(eq(bookings.id, booking.id))
          .returning();

        await tx.insert(bookingStatusLogs).values({
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: nextStatus,
          changedByUserId: req.authUser!.id,
          note: `Trip marked ${nextStatus} by driver.`,
        });

        if (nextStatus === 'COMPLETED') {
          await tx
            .update(driverProfiles)
            .set({ totalTrips: profile.totalTrips + 1 })
            .where(eq(driverProfiles.id, profile.id));
        }

        return rows;
      });

      res.json({ booking: updated });
    } catch (err) {
      console.error('Driver trip status error:', err);
      res.status(500).json({ error: 'Unable to update trip status.' });
    }
  }
);

// ---------------- VEHICLE OWNER DASHBOARD ----------------

app.get(
  '/api/owner/me',
  requireAuth,
  requireRole('VEHICLE_OWNER', 'ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const [owner] = await db
        .select()
        .from(vehicleOwners)
        .where(eq(vehicleOwners.userId, req.authUser!.id))
        .limit(1);

      if (!owner) {
        return res.status(404).json({ error: 'Vehicle owner profile not found.' });
      }

      const ownerVehicles = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.ownerId, owner.id))
        .orderBy(desc(vehicles.createdAt));

      const vehicleIds = ownerVehicles.map((v) => v.id);
      const ownerBookings =
        vehicleIds.length > 0
          ? await db
              .select()
              .from(bookings)
              .where(inArray(bookings.vehicleId, vehicleIds))
              .orderBy(desc(bookings.createdAt))
          : [];

      const earningsNgn = ownerBookings
        .filter((b) => b.status === 'COMPLETED' || b.status === 'CONFIRMED')
        .reduce((sum, b) => sum + b.subtotalNgn, 0);

      res.json({
        owner,
        vehicles: ownerVehicles,
        bookings: ownerBookings,
        earningsNgn,
      });
    } catch (err) {
      console.error('Owner dashboard error:', err);
      res.status(500).json({ error: 'Unable to load owner dashboard.' });
    }
  }
);

app.post(
  '/api/owner/vehicles',
  requireAuth,
  requireRole('VEHICLE_OWNER', 'ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const [owner] = await db
        .select()
        .from(vehicleOwners)
        .where(eq(vehicleOwners.userId, req.authUser!.id))
        .limit(1);

      if (!owner) {
        return res.status(404).json({ error: 'Vehicle owner profile not found.' });
      }

      const {
        make,
        model,
        year,
        category = 'SEDAN',
        transmission = 'AUTOMATIC',
        fuelType = 'Petrol',
        seats = 5,
        location,
        plateNumber,
        description,
        dailyRateNgn,
        weeklyRateNgn,
        monthlyRateNgn,
        allowsSelfDrive = true,
        allowsChauffeur = true,
        primaryImageUrl = '/src/assets/images/vehicle_exec_sedan_1795309126661.jpg',
      } = req.body ?? {};

      if (!make || !model || !location || !plateNumber || !dailyRateNgn) {
        return res
          .status(400)
          .json({ error: 'Make, model, location, plate number, and daily rate are required.' });
      }

      // Only allow local generated assets or https:// URLs
      const safeImageUrl =
        typeof primaryImageUrl === 'string' &&
        (primaryImageUrl.startsWith('/src/assets/') ||
          primaryImageUrl.startsWith('https://'))
          ? primaryImageUrl
          : '/src/assets/images/vehicle_exec_sedan_1795309126661.jpg';

      const [vehicle] = await db.transaction(async (tx) => {
        const [v] = await tx
          .insert(vehicles)
          .values({
            ownerId: owner.id,
            make: String(make).trim(),
            model: String(model).trim(),
            year: Number(year) || 2023,
            category: String(category).toUpperCase(),
            transmission: String(transmission).toUpperCase(),
            fuelType: String(fuelType),
            seats: Math.max(2, Number(seats) || 5),
            location: String(location).trim(),
            plateNumber: String(plateNumber).trim().toUpperCase(),
            description:
              String(description || '').trim() ||
              `${year || 2023} ${make} ${model} available in ${location}.`,
            features: ['Full AC', 'Comprehensive Insurance'],
            requirements: ['Valid ID required at pickup'],
            dailyRateNgn: Math.max(5000, Number(dailyRateNgn)),
            weeklyRateNgn: Math.max(
              25000,
              Number(weeklyRateNgn) || Number(dailyRateNgn) * 6
            ),
            monthlyRateNgn: Math.max(
              100000,
              Number(monthlyRateNgn) || Number(dailyRateNgn) * 22
            ),
            allowsSelfDrive: Boolean(allowsSelfDrive),
            allowsChauffeur: Boolean(allowsChauffeur),
            approvalStatus: 'PENDING',
            availabilityStatus: 'AVAILABLE',
            primaryImageUrl: safeImageUrl,
          })
          .returning();

        await tx.insert(vehicleImages).values({
          vehicleId: v.id,
          imageUrl: safeImageUrl,
          caption: `${v.year} ${v.make} ${v.model}`,
          sortOrder: 0,
        });

        return [v];
      });

      res.status(201).json({ vehicle });
    } catch (err) {
      console.error('Register vehicle error:', err);
      res.status(500).json({ error: 'Unable to register vehicle.' });
    }
  }
);

app.patch(
  '/api/owner/vehicles/:id',
  requireAuth,
  requireRole('VEHICLE_OWNER', 'ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const vehicleId = Number(req.params.id);
      const [owner] = await db
        .select()
        .from(vehicleOwners)
        .where(eq(vehicleOwners.userId, req.authUser!.id))
        .limit(1);

      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, vehicleId))
        .limit(1);

      if (!vehicle || (!owner && req.authUser!.role !== 'ADMIN') || (owner && vehicle.ownerId !== owner.id && req.authUser!.role !== 'ADMIN')) {
        return res.status(404).json({ error: 'Vehicle not found.' });
      }

      const { dailyRateNgn, weeklyRateNgn, monthlyRateNgn, availabilityStatus } =
        req.body ?? {};

      const [updated] = await db
        .update(vehicles)
        .set({
          dailyRateNgn:
            Number(dailyRateNgn) > 0 ? Number(dailyRateNgn) : vehicle.dailyRateNgn,
          weeklyRateNgn:
            Number(weeklyRateNgn) > 0 ? Number(weeklyRateNgn) : vehicle.weeklyRateNgn,
          monthlyRateNgn:
            Number(monthlyRateNgn) > 0
              ? Number(monthlyRateNgn)
              : vehicle.monthlyRateNgn,
          availabilityStatus: ['AVAILABLE', 'RENTED', 'MAINTENANCE'].includes(
            availabilityStatus
          )
            ? availabilityStatus
            : vehicle.availabilityStatus,
        })
        .where(eq(vehicles.id, vehicle.id))
        .returning();

      res.json({ vehicle: updated });
    } catch (err) {
      console.error('Update vehicle error:', err);
      res.status(500).json({ error: 'Unable to update vehicle.' });
    }
  }
);

app.post(
  '/api/owner/availability',
  requireAuth,
  requireRole('VEHICLE_OWNER', 'ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const { vehicleId, startDate, endDate, reason = 'Scheduled Maintenance' } =
        req.body ?? {};
      const [owner] = await db
        .select()
        .from(vehicleOwners)
        .where(eq(vehicleOwners.userId, req.authUser!.id))
        .limit(1);

      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, Number(vehicleId)))
        .limit(1);

      if (!vehicle || !owner || vehicle.ownerId !== owner.id) {
        return res.status(404).json({ error: 'Vehicle not found.' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return res.status(400).json({ error: 'Valid start and end dates required.' });
      }

      const [block] = await db
        .insert(availabilityBlocks)
        .values({
          targetType: 'VEHICLE',
          targetId: vehicle.id,
          startDate: start,
          endDate: end,
          reason: String(reason),
        })
        .returning();

      res.status(201).json({ block });
    } catch (err) {
      console.error('Owner availability block error:', err);
      res.status(500).json({ error: 'Unable to save availability block.' });
    }
  }
);

app.post(
  '/api/owner/bookings/:id/decision',
  requireAuth,
  requireRole('VEHICLE_OWNER', 'ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const bookingId = Number(req.params.id);
      const decision = String(req.body?.decision || '').toUpperCase();
      if (!['ACCEPTED', 'REJECTED'].includes(decision)) {
        return res.status(400).json({ error: 'Decision must be ACCEPTED or REJECTED.' });
      }

      const [owner] = await db
        .select()
        .from(vehicleOwners)
        .where(eq(vehicleOwners.userId, req.authUser!.id))
        .limit(1);

      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (!booking || !booking.vehicleId || !owner) {
        return res.status(404).json({ error: 'Rental booking not found.' });
      }

      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, booking.vehicleId))
        .limit(1);

      if (!vehicle || vehicle.ownerId !== owner.id) {
        return res.status(403).json({ error: 'Unauthorized.' });
      }

      const nextStatus = decision === 'REJECTED' ? 'CANCELLED' : booking.status;

      const [updated] = await db
        .update(bookings)
        .set({
          ownerDecision: decision,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id))
        .returning();

      await db.insert(bookingStatusLogs).values({
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: nextStatus,
        changedByUserId: req.authUser!.id,
        note: `Vehicle owner ${decision.toLowerCase()} rental request.`,
      });

      res.json({ booking: updated });
    } catch (err) {
      console.error('Owner booking decision error:', err);
      res.status(500).json({ error: 'Unable to update rental decision.' });
    }
  }
);

// ---------------- ADMIN DASHBOARD ----------------

app.get(
  '/api/admin/overview',
  requireAuth,
  requireRole('ADMIN'),
  async (_req: AuthRequest, res) => {
    try {
      const [customerCount] = await db
        .select({ total: count() })
        .from(users)
        .where(eq(users.role, 'CUSTOMER'));
      const [driverCount] = await db.select({ total: count() }).from(driverProfiles);
      const [vehicleCount] = await db.select({ total: count() }).from(vehicles);
      const [bookingCount] = await db.select({ total: count() }).from(bookings);
      const [revenueAgg] = await db
        .select({
          grossVolume: sql<number>`coalesce(sum(${payments.amountNgn}), 0)`,
        })
        .from(payments)
        .where(eq(payments.status, 'PAID'));

      const pendingDrivers = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.verificationStatus, 'PENDING'));

      const allDrivers = await db
        .select()
        .from(driverProfiles)
        .orderBy(desc(driverProfiles.createdAt));

      const pendingVehicles = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.approvalStatus, 'PENDING'));

      const allVehicles = await db
        .select()
        .from(vehicles)
        .orderBy(desc(vehicles.createdAt));

      const allBookings = await db
        .select()
        .from(bookings)
        .orderBy(desc(bookings.createdAt))
        .limit(50);

      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          phone: users.phone,
          role: users.role,
          isActive: users.isActive,
          isDemo: users.isDemo,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      const commissionRatePct = await getCommissionRatePct();

      res.json({
        stats: {
          totalCustomers: Number(customerCount?.total ?? 0),
          registeredDrivers: Number(driverCount?.total ?? 0),
          registeredVehicles: Number(vehicleCount?.total ?? 0),
          totalBookings: Number(bookingCount?.total ?? 0),
          grossRevenueNgn: Number(revenueAgg?.grossVolume ?? 0),
          commissionRatePct,
        },
        pendingDrivers,
        allDrivers,
        pendingVehicles,
        allVehicles,
        bookings: allBookings,
        users: allUsers,
      });
    } catch (err) {
      console.error('Admin overview error:', err);
      res.status(500).json({ error: 'Unable to load admin overview.' });
    }
  }
);

app.post(
  '/api/admin/drivers/:id/verify',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const driverId = Number(req.params.id);
      const status = String(req.body?.status || '').toUpperCase();
      if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
        return res.status(400).json({ error: 'Invalid verification status.' });
      }

      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx
          .update(driverProfiles)
          .set({ verificationStatus: status })
          .where(eq(driverProfiles.id, driverId))
          .returning();

        if (status === 'VERIFIED') {
          await tx
            .update(driverDocuments)
            .set({ status: 'VERIFIED', verifiedAt: new Date() })
            .where(eq(driverDocuments.driverId, driverId));
        }

        return rows;
      });

      if (!updated) {
        return res.status(404).json({ error: 'Driver not found.' });
      }

      res.json({ driver: updated });
    } catch (err) {
      console.error('Admin verify driver error:', err);
      res.status(500).json({ error: 'Unable to update driver verification.' });
    }
  }
);

app.post(
  '/api/admin/vehicles/:id/approve',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const vehicleId = Number(req.params.id);
      const status = String(req.body?.status || '').toUpperCase();
      if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
        return res.status(400).json({ error: 'Invalid approval status.' });
      }

      const [updated] = await db
        .update(vehicles)
        .set({ approvalStatus: status })
        .where(eq(vehicles.id, vehicleId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Vehicle not found.' });
      }

      res.json({ vehicle: updated });
    } catch (err) {
      console.error('Admin approve vehicle error:', err);
      res.status(500).json({ error: 'Unable to update vehicle approval.' });
    }
  }
);

app.patch(
  '/api/admin/bookings/:id',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const bookingId = Number(req.params.id);
      const { status, disputeStatus, note } = req.body ?? {};

      const [existing] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'Booking not found.' });
      }

      const nextStatus = status || existing.status;
      const nextDispute = disputeStatus || existing.disputeStatus;

      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx
          .update(bookings)
          .set({
            status: nextStatus,
            disputeStatus: nextDispute,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, bookingId))
          .returning();

        if (nextStatus !== existing.status) {
          await tx.insert(bookingStatusLogs).values({
            bookingId,
            fromStatus: existing.status,
            toStatus: nextStatus,
            changedByUserId: req.authUser!.id,
            note: note || `Admin updated booking status to ${nextStatus}.`,
          });
        }

        return rows;
      });

      res.json({ booking: updated });
    } catch (err) {
      console.error('Admin booking update error:', err);
      res.status(500).json({ error: 'Unable to update booking.' });
    }
  }
);

app.patch(
  '/api/admin/users/:id',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const userId = Number(req.params.id);
      const { isActive, role } = req.body ?? {};

      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const [updated] = await db
        .update(users)
        .set({
          isActive: typeof isActive === 'boolean' ? isActive : existing.isActive,
          role: ['CUSTOMER', 'DRIVER', 'VEHICLE_OWNER', 'ADMIN'].includes(role)
            ? role
            : existing.role,
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
        });

      res.json({ user: updated });
    } catch (err) {
      console.error('Admin update user error:', err);
      res.status(500).json({ error: 'Unable to update user.' });
    }
  }
);

app.patch(
  '/api/admin/settings/commission',
  requireAuth,
  requireRole('ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      const rate = Number(req.body?.commissionRatePct);
      if (Number.isNaN(rate) || rate < 0 || rate > 40) {
        return res
          .status(400)
          .json({ error: 'Commission rate must be between 0% and 40%.' });
      }

      await db
        .insert(platformSettings)
        .values({ key: 'commission_rate_pct', value: String(rate) })
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: { value: String(rate), updatedAt: new Date() },
        });

      res.json({ commissionRatePct: rate });
    } catch (err) {
      console.error('Update commission error:', err);
      res.status(500).json({ error: 'Unable to update commission rate.' });
    }
  }
);

// ---------------- VITE / STATIC SERVING ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Production build not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ProDrivers server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
