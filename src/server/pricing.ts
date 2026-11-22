import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { driverProfiles, platformSettings, vehicles } from '../db/schema.ts';

export type DurationUnit = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type ServiceType =
  | 'DRIVER_HIRE'
  | 'CAR_RENTAL'
  | 'CHAUFFEUR_CAR'
  | 'AIRPORT_TRANSFER'
  | 'CORPORATE'
  | 'INTERCITY'
  | 'EVENT';
export type RentalOption = 'SELF_DRIVE' | 'CHAUFFEUR' | 'DRIVER_ONLY';

export interface PricingQuoteInput {
  driverId?: number | null;
  vehicleId?: number | null;
  serviceType: ServiceType;
  rentalOption: RentalOption;
  durationUnit: DurationUnit;
  durationCount: number;
}

export interface PricingQuoteResult {
  driverFeeNgn: number;
  vehicleFeeNgn: number;
  serviceSurchargeNgn: number;
  subtotalNgn: number;
  commissionRatePct: number;
  platformFeeNgn: number;
  totalAmountNgn: number;
  breakdown: { label: string; amountNgn: number }[];
}

export async function getCommissionRatePct(): Promise<number> {
  try {
    const rows = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, 'commission_rate_pct'))
      .limit(1);
    if (rows.length > 0) {
      const parsed = Number(rows[0].value);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 40) {
        return parsed;
      }
    }
  } catch {
    // Fallback to default platform commission
  }
  return 10;
}

export function computeEndDate(
  startDate: Date,
  unit: DurationUnit,
  count: number
): Date {
  const ms = startDate.getTime();
  switch (unit) {
    case 'HOURLY':
      return new Date(ms + count * 60 * 60 * 1000);
    case 'DAILY':
      return new Date(ms + count * 24 * 60 * 60 * 1000);
    case 'WEEKLY':
      return new Date(ms + count * 7 * 24 * 60 * 60 * 1000);
    case 'MONTHLY':
      return new Date(ms + count * 30 * 24 * 60 * 60 * 1000);
  }
}

function getDurationDaysEquivalent(unit: DurationUnit, count: number): number {
  switch (unit) {
    case 'HOURLY':
      return Math.max(1, Math.ceil(count / 8));
    case 'DAILY':
      return count;
    case 'WEEKLY':
      return count * 7;
    case 'MONTHLY':
      return count * 30;
  }
}

export async function calculateBookingPricing(
  input: PricingQuoteInput,
  txDb: typeof db = db
): Promise<PricingQuoteResult> {
  const count = Math.max(1, Math.min(365, Math.floor(input.durationCount)));
  const breakdown: { label: string; amountNgn: number }[] = [];

  let driverFeeNgn = 0;
  let vehicleFeeNgn = 0;

  if (input.driverId) {
    const [driver] = await txDb
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.id, input.driverId))
      .limit(1);

    if (!driver) {
      throw new Error('Selected driver not found.');
    }

    let unitRate = driver.dailyRateNgn;
    if (input.durationUnit === 'HOURLY') unitRate = driver.hourlyRateNgn;
    else if (input.durationUnit === 'WEEKLY') unitRate = driver.weeklyRateNgn;
    else if (input.durationUnit === 'MONTHLY') unitRate = driver.monthlyRateNgn;

    driverFeeNgn = unitRate * count;
    breakdown.push({
      label: `Professional Driver (${driver.fullName} · ${count} ${input.durationUnit.toLowerCase()})`,
      amountNgn: driverFeeNgn,
    });
  }

  if (input.vehicleId) {
    const [vehicle] = await txDb
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, input.vehicleId))
      .limit(1);

    if (!vehicle) {
      throw new Error('Selected vehicle not found.');
    }

    if (input.durationUnit === 'HOURLY') {
      throw new Error('Vehicle rentals require Daily, Weekly, or Monthly duration.');
    }

    let unitRate = vehicle.dailyRateNgn;
    if (input.durationUnit === 'WEEKLY') unitRate = vehicle.weeklyRateNgn;
    else if (input.durationUnit === 'MONTHLY') unitRate = vehicle.monthlyRateNgn;

    vehicleFeeNgn = unitRate * count;
    breakdown.push({
      label: `Vehicle Rental (${vehicle.year} ${vehicle.make} ${vehicle.model} · ${count} ${input.durationUnit.toLowerCase()})`,
      amountNgn: vehicleFeeNgn,
    });

    // If customer chooses Chauffeur-driven car without specifying an individual driver
    if (input.rentalOption === 'CHAUFFEUR' && !input.driverId) {
      const days = getDurationDaysEquivalent(input.durationUnit, count);
      const chauffeurFee = vehicle.chauffeurSurchargeDailyNgn * days;
      driverFeeNgn += chauffeurFee;
      breakdown.push({
        label: `Assigned Fleet Chauffeur (${days} day${days > 1 ? 's' : ''})`,
        amountNgn: chauffeurFee,
      });
    }
  }

  if (driverFeeNgn === 0 && vehicleFeeNgn === 0) {
    throw new Error('A driver or vehicle must be selected for booking.');
  }

  let serviceSurchargeNgn = 0;
  if (input.serviceType === 'AIRPORT_TRANSFER') {
    serviceSurchargeNgn = 8000;
    breakdown.push({
      label: 'Murtala Muhammed Airport Meet & Protocol Fee',
      amountNgn: serviceSurchargeNgn,
    });
  } else if (input.serviceType === 'INTERCITY') {
    serviceSurchargeNgn = 15000;
    breakdown.push({
      label: 'Intercity Highway Logistics Allowance',
      amountNgn: serviceSurchargeNgn,
    });
  } else if (input.serviceType === 'EVENT') {
    serviceSurchargeNgn = 10000;
    breakdown.push({
      label: 'Event Standby & Coordination Fee',
      amountNgn: serviceSurchargeNgn,
    });
  }

  const subtotalNgn = driverFeeNgn + vehicleFeeNgn + serviceSurchargeNgn;
  const commissionRatePct = await getCommissionRatePct();
  const platformFeeNgn = Math.round((subtotalNgn * commissionRatePct) / 100);
  const totalAmountNgn = subtotalNgn + platformFeeNgn;

  breakdown.push({
    label: `ProDrivers Platform Service & Protection (${commissionRatePct}%)`,
    amountNgn: platformFeeNgn,
  });

  return {
    driverFeeNgn,
    vehicleFeeNgn,
    serviceSurchargeNgn,
    subtotalNgn,
    commissionRatePct,
    platformFeeNgn,
    totalAmountNgn,
    breakdown,
  };
}
