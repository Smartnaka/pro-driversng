import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

const SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const ADMIN_EMAIL = 'adeotiisrael2022@gmail.com';

export interface NotificationPrefs {
  bookingAlerts: boolean;
  paymentAlerts: boolean;
  marketingEmails: boolean;
}

export interface AuthUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'CUSTOMER' | 'DRIVER' | 'VEHICLE_OWNER' | 'ADMIN';
  avatarUrl: string | null;
  defaultPickupLocation: string | null;
  onboardingCompleted: boolean;
  notificationPrefs: NotificationPrefs;
  hasPassword: boolean;
  isActive: boolean;
}

export function isSafeImageInput(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed || trimmed.length > 900_000) return false;
  if (trimmed.startsWith('/src/assets/')) return true;
  if (/^https:\/\/[^\s]+$/i.test(trimmed)) return true;
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return true;
  }
  return false;
}

export interface AuthRequest extends Request {
  authUser?: AuthUser;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function signSessionToken(user: {
  id: number;
  uid: string;
  email: string;
  role: string;
}): string {
  const payload = {
    sub: user.id,
    uid: user.uid,
    email: user.email,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `pd.${encoded}.${signature}`;
}

function verifySessionToken(token: string): {
  sub: number;
  uid: string;
  email: string;
  role: string;
} | null {
  if (!token.startsWith('pd.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, encoded, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    );
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getOrCreateFirebaseUser(params: {
  uid: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  requestedRole?: string;
}): Promise<AuthUser> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const isDefaultAdmin = normalizedEmail === ADMIN_EMAIL;

  const existingByEmail = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingByEmail.length > 0) {
    const existing = existingByEmail[0];
    const [updated] = await db
      .update(users)
      .set({
        uid: params.uid,
        avatarUrl: params.avatarUrl ?? existing.avatarUrl,
        role: isDefaultAdmin ? 'ADMIN' : existing.role,
      })
      .where(eq(users.id, existing.id))
      .returning();

    return toAuthUser(updated);
  }

  const allowedSelfRoles = ['CUSTOMER', 'DRIVER', 'VEHICLE_OWNER'];
  const assignedRole = isDefaultAdmin
    ? 'ADMIN'
    : allowedSelfRoles.includes(params.requestedRole || '')
      ? (params.requestedRole as string)
      : 'CUSTOMER';

  const [created] = await db
    .insert(users)
    .values({
      uid: params.uid,
      email: normalizedEmail,
      fullName: params.fullName || normalizedEmail.split('@')[0],
      avatarUrl: params.avatarUrl || null,
      role: assignedRole,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email: normalizedEmail,
      },
    })
    .returning();

  return toAuthUser(created);
}

export function toAuthUser(row: typeof users.$inferSelect): AuthUser {
  const prefs = row.notificationPrefs || {
    bookingAlerts: true,
    paymentAlerts: true,
    marketingEmails: false,
  };
  return {
    id: row.id,
    uid: row.uid,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    role: row.role as AuthUser['role'],
    avatarUrl: row.avatarUrl,
    defaultPickupLocation: row.defaultPickupLocation ?? null,
    onboardingCompleted: Boolean(row.onboardingCompleted),
    notificationPrefs: {
      bookingAlerts: prefs.bookingAlerts !== false,
      paymentAlerts: prefs.paymentAlerts !== false,
      marketingEmails: Boolean(prefs.marketingEmails),
    },
    hasPassword: Boolean(row.passwordHash),
    isActive: row.isActive,
  };
}

export async function resolveAuthUserFromHeader(
  authHeader?: string
): Promise<AuthUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  // 1. Check ProDrivers signed session token
  if (token.startsWith('pd.')) {
    const decoded = verifySessionToken(token);
    if (!decoded) return null;
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.sub))
      .limit(1);
    if (rows.length === 0 || !rows[0].isActive) return null;
    return toAuthUser(rows[0]);
  }

  // 2. Verify Firebase ID Token
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = decodedToken.email || `${decodedToken.uid}@firebase.local`;
    const user = await getOrCreateFirebaseUser({
      uid: decodedToken.uid,
      email,
      fullName: decodedToken.name || email.split('@')[0],
      avatarUrl: decodedToken.picture,
    });
    if (!user.isActive) return null;
    return user;
  } catch (err) {
    console.error('Firebase token verification/sync failed:', err);
    return null;
  }
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await resolveAuthUserFromHeader(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    req.authUser = user;
    next();
  } catch (err) {
    console.error('Auth verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.authUser.role)) {
      return res
        .status(403)
        .json({ error: 'You do not have permission for this action.' });
    }
    next();
  };
}
