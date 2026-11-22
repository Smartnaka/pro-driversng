export const LAGOS_LOCATIONS = [
  'Victoria Island, Lagos',
  'Ikoyi, Lagos',
  'Lekki Phase 1, Lagos',
  'Ikeja GRA, Lagos',
  'Murtala Muhammed Airport (MMIA)',
  'Yaba, Lagos',
  'Surulere, Lagos',
  'Oniru, Lagos',
  'Eko Atlantic, Lagos',
  'Ibadan (Intercity)',
  'Abeokuta (Intercity)',
];

export function formatNaira(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  return `₦${Math.round(num).toLocaleString('en-NG')}`;
}

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTimeFull(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'AWAITING_PAYMENT':
      return 'Awaiting Payment';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'SELF_DRIVE':
      return 'Self-Drive';
    case 'CHAUFFEUR':
      return 'Chauffeur-Driven';
    case 'DRIVER_ONLY':
      return 'Driver Only';
    case 'AIRPORT_TRANSFER':
      return 'Airport Transfer';
    case 'CAR_RENTAL':
      return 'Car Rental';
    case 'CHAUFFEUR_CAR':
      return 'Vehicle + Chauffeur';
    case 'DRIVER_HIRE':
      return 'Driver Hire';
    default:
      return status
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export interface DriverProfile {
  id: number;
  userId: number;
  fullName: string;
  photoUrl: string;
  location: string;
  serviceAreas: string[];
  yearsExperience: number;
  bio: string;
  categories: string[];
  languages: string[];
  hourlyRateNgn: number;
  dailyRateNgn: number;
  weeklyRateNgn: number;
  monthlyRateNgn: number;
  ratingAvg: string;
  totalTrips: number;
  verificationStatus: string;
  availabilityStatus: string;
  isDemo: boolean;
}

export interface Vehicle {
  id: number;
  ownerId: number;
  make: string;
  model: string;
  year: number;
  category: string;
  transmission: string;
  fuelType: string;
  seats: number;
  location: string;
  plateNumber: string;
  description: string;
  features: string[];
  requirements: string[];
  dailyRateNgn: number;
  weeklyRateNgn: number;
  monthlyRateNgn: number;
  chauffeurSurchargeDailyNgn: number;
  allowsSelfDrive: boolean;
  allowsChauffeur: boolean;
  approvalStatus: string;
  availabilityStatus: string;
  primaryImageUrl: string;
  ownerCompany?: string;
  ownerLocation?: string;
  isDemo: boolean;
}

export interface BookingRecord {
  id: number;
  bookingCode: string;
  customerId: number;
  driverId: number | null;
  vehicleId: number | null;
  serviceType: string;
  rentalOption: string;
  durationUnit: string;
  durationCount: number;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  destination: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string | null;
  subtotalNgn: number;
  platformFeeNgn: number;
  totalAmountNgn: number;
  status: string;
  driverDecision: string | null;
  ownerDecision: string | null;
  disputeStatus: string | null;
  disputeReason: string | null;
  isDemo: boolean;
  createdAt: string;
  driverName?: string | null;
  driverPhoto?: string | null;
  vehicleName?: string | null;
  vehicleImage?: string | null;
  hasReview?: boolean;
}
