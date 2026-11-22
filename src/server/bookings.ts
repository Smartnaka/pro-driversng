import crypto from 'node:crypto';
import { and, eq, gt, inArray, lt, ne } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  availabilityBlocks,
  bookings,
  bookingStatusLogs,
  driverProfiles,
  notifications,
  payments,
  transactions,
  vehicles,
  vehicleOwners,
} from '../db/schema.ts';
import {
  calculateBookingPricing,
  computeEndDate,
  type DurationUnit,
  type RentalOption,
  type ServiceType,
} from './pricing.ts';

const ACTIVE_BOOKING_STATUSES = [
  'PENDING',
  'AWAITING_PAYMENT',
  'CONFIRMED',
  'IN_PROGRESS',
];

export interface CreateBookingPayload {
  customerId: number;
  driverId?: number | null;
  vehicleId?: number | null;
  serviceType: ServiceType;
  rentalOption: RentalOption;
  durationUnit: DurationUnit;
  durationCount: number;
  startDateIso: string;
  pickupLocation: string;
  destination?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes?: string;
}

export async function checkAvailabilityConflicts(
  params: {
    driverId?: number | null;
    vehicleId?: number | null;
    startDate: Date;
    endDate: Date;
    excludeBookingId?: number;
  },
  txDb: typeof db = db
): Promise<string | null> {
  const { driverId, vehicleId, startDate, endDate, excludeBookingId } = params;

  if (driverId) {
    const bookingConditions = [
      eq(bookings.driverId, driverId),
      inArray(bookings.status, ACTIVE_BOOKING_STATUSES),
      lt(bookings.startDate, endDate),
      gt(bookings.endDate, startDate),
    ];
    if (excludeBookingId) {
      bookingConditions.push(ne(bookings.id, excludeBookingId));
    }

    const overlappingDriverBookings = await txDb
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(...bookingConditions))
      .limit(1);

    if (overlappingDriverBookings.length > 0) {
      return 'Selected driver already has an overlapping booking during this window.';
    }

    const blockedDriverDates = await txDb
      .select({ id: availabilityBlocks.id })
      .from(availabilityBlocks)
      .where(
        and(
          eq(availabilityBlocks.targetType, 'DRIVER'),
          eq(availabilityBlocks.targetId, driverId),
          lt(availabilityBlocks.startDate, endDate),
          gt(availabilityBlocks.endDate, startDate)
        )
      )
      .limit(1);

    if (blockedDriverDates.length > 0) {
      return 'Selected driver has marked these dates as unavailable.';
    }
  }

  if (vehicleId) {
    const vehicleBookingConditions = [
      eq(bookings.vehicleId, vehicleId),
      inArray(bookings.status, ACTIVE_BOOKING_STATUSES),
      lt(bookings.startDate, endDate),
      gt(bookings.endDate, startDate),
    ];
    if (excludeBookingId) {
      vehicleBookingConditions.push(ne(bookings.id, excludeBookingId));
    }

    const overlappingVehicleBookings = await txDb
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(...vehicleBookingConditions))
      .limit(1);

    if (overlappingVehicleBookings.length > 0) {
      return 'Selected vehicle is already reserved during this period.';
    }

    const blockedVehicleDates = await txDb
      .select({ id: availabilityBlocks.id })
      .from(availabilityBlocks)
      .where(
        and(
          eq(availabilityBlocks.targetType, 'VEHICLE'),
          eq(availabilityBlocks.targetId, vehicleId),
          lt(availabilityBlocks.startDate, endDate),
          gt(availabilityBlocks.endDate, startDate)
        )
      )
      .limit(1);

    if (blockedVehicleDates.length > 0) {
      return 'Selected vehicle is blocked for maintenance or owner use on those dates.';
    }
  }

  return null;
}

export async function createTransactionalBooking(payload: CreateBookingPayload) {
  const startDate = new Date(payload.startDateIso);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid booking start date.');
  }
  const endDate = computeEndDate(
    startDate,
    payload.durationUnit,
    payload.durationCount
  );

  return await db.transaction(async (tx) => {
    let driverRow: typeof driverProfiles.$inferSelect | null = null;
    if (payload.driverId) {
      const rows = await tx
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.id, payload.driverId))
        .limit(1);
      if (rows.length === 0) throw new Error('Selected driver does not exist.');
      driverRow = rows[0];
      if (driverRow.verificationStatus !== 'VERIFIED') {
        throw new Error(
          'Only verified drivers can be booked on ProDrivers.'
        );
      }
      if (driverRow.availabilityStatus === 'OFFLINE') {
        throw new Error('This driver is currently offline.');
      }
    }

    let vehicleRow: typeof vehicles.$inferSelect | null = null;
    if (payload.vehicleId) {
      const rows = await tx
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, payload.vehicleId))
        .limit(1);
      if (rows.length === 0) throw new Error('Selected vehicle does not exist.');
      vehicleRow = rows[0];
      if (vehicleRow.approvalStatus !== 'APPROVED') {
        throw new Error('Only approved vehicles are available for booking.');
      }
      if (vehicleRow.availabilityStatus === 'MAINTENANCE') {
        throw new Error('This vehicle is currently under maintenance.');
      }
      if (payload.rentalOption === 'SELF_DRIVE' && !vehicleRow.allowsSelfDrive) {
        throw new Error('This vehicle is only available with a chauffeur.');
      }
      if (payload.rentalOption === 'CHAUFFEUR' && !vehicleRow.allowsChauffeur) {
        throw new Error('This vehicle is configured for self-drive only.');
      }
    }

    const conflictMessage = await checkAvailabilityConflicts(
      {
        driverId: payload.driverId,
        vehicleId: payload.vehicleId,
        startDate,
        endDate,
      },
      tx as unknown as typeof db
    );

    if (conflictMessage) {
      throw new Error(conflictMessage);
    }

    const quote = await calculateBookingPricing(
      {
        driverId: payload.driverId,
        vehicleId: payload.vehicleId,
        serviceType: payload.serviceType,
        rentalOption: payload.rentalOption,
        durationUnit: payload.durationUnit,
        durationCount: payload.durationCount,
      },
      tx as unknown as typeof db
    );

    const bookingCode = `PD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const [created] = await tx
      .insert(bookings)
      .values({
        bookingCode,
        customerId: payload.customerId,
        driverId: payload.driverId || null,
        vehicleId: payload.vehicleId || null,
        serviceType: payload.serviceType,
        rentalOption: payload.rentalOption,
        durationUnit: payload.durationUnit,
        durationCount: payload.durationCount,
        startDate,
        endDate,
        pickupLocation: payload.pickupLocation.trim(),
        destination: payload.destination?.trim() || null,
        customerName: payload.customerName.trim(),
        customerPhone: payload.customerPhone.trim(),
        customerEmail: payload.customerEmail.trim().toLowerCase(),
        notes: payload.notes?.trim() || null,
        subtotalNgn: quote.subtotalNgn,
        platformFeeNgn: quote.platformFeeNgn,
        totalAmountNgn: quote.totalAmountNgn,
        status: 'AWAITING_PAYMENT',
        driverDecision: payload.driverId ? 'PENDING' : null,
        ownerDecision: payload.vehicleId ? 'PENDING' : null,
      })
      .returning();

    await tx.insert(bookingStatusLogs).values({
      bookingId: created.id,
      fromStatus: null,
      toStatus: 'AWAITING_PAYMENT',
      changedByUserId: payload.customerId,
      note: 'Booking created and awaiting payment confirmation.',
    });

    if (driverRow) {
      await tx.insert(notifications).values({
        userId: driverRow.userId,
        title: `New Booking Request (${bookingCode})`,
        message: `${payload.customerName} requested a ${payload.durationCount} ${payload.durationUnit.toLowerCase()} trip starting at ${payload.pickupLocation}.`,
      });
    }

    if (vehicleRow) {
      const [ownerRow] = await tx
        .select()
        .from(vehicleOwners)
        .where(eq(vehicleOwners.id, vehicleRow.ownerId))
        .limit(1);
      if (ownerRow) {
        await tx.insert(notifications).values({
          userId: ownerRow.userId,
          title: `New Vehicle Reservation (${bookingCode})`,
          message: `${vehicleRow.year} ${vehicleRow.make} ${vehicleRow.model} reserved by ${payload.customerName}.`,
        });
      }
    }

    return { booking: created, quote };
  });
}

export async function finalizePaidBookingIdempotent(params: {
  reference: string;
  channel: string;
  providerPayload: unknown;
  actorUserId?: number;
}) {
  return await db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.reference, params.reference))
      .limit(1);

    if (!payment) {
      throw new Error('Payment reference not found.');
    }

    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId))
      .limit(1);

    if (!booking) {
      throw new Error('Associated booking not found.');
    }

    // Idempotent guard: already marked PAID
    if (payment.status === 'PAID') {
      return { payment, booking, alreadyProcessed: true };
    }

    const now = new Date();
    const [updatedPayment] = await tx
      .update(payments)
      .set({
        status: 'PAID',
        channel: params.channel,
        providerPayload: params.providerPayload as Record<string, unknown>,
        paidAt: now,
      })
      .where(eq(payments.id, payment.id))
      .returning();

    const nextStatus =
      booking.status === 'AWAITING_PAYMENT' || booking.status === 'PENDING'
        ? 'CONFIRMED'
        : booking.status;

    const [updatedBooking] = await tx
      .update(bookings)
      .set({
        status: nextStatus,
        updatedAt: now,
      })
      .where(eq(bookings.id, booking.id))
      .returning();

    if (nextStatus !== booking.status) {
      await tx.insert(bookingStatusLogs).values({
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: nextStatus,
        changedByUserId: params.actorUserId ?? booking.customerId,
        note: `Payment verified (${params.reference} via ${params.channel}).`,
      });
    }

    await tx.insert(transactions).values([
      {
        paymentId: payment.id,
        bookingId: booking.id,
        userId: booking.customerId,
        type: 'CUSTOMER_PAYMENT',
        amountNgn: payment.amountNgn,
        status: 'RECORDED',
        reference: params.reference,
        description: `Booking payment for ${booking.bookingCode}`,
      },
      {
        paymentId: payment.id,
        bookingId: booking.id,
        userId: booking.customerId,
        type: 'PLATFORM_COMMISSION',
        amountNgn: booking.platformFeeNgn,
        status: 'RECORDED',
        reference: params.reference,
        description: `Platform service fee for ${booking.bookingCode}`,
      },
    ]);

    return {
      payment: updatedPayment,
      booking: updatedBooking,
      alreadyProcessed: false,
    };
  });
}
