import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('CUSTOMER'), // CUSTOMER | DRIVER | VEHICLE_OWNER | ADMIN
  avatarUrl: text('avatar_url'),
  defaultPickupLocation: text('default_pickup_location'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  notificationPrefs: jsonb('notification_prefs')
    .$type<{
      bookingAlerts: boolean;
      paymentAlerts: boolean;
      marketingEmails: boolean;
    }>()
    .notNull()
    .default({ bookingAlerts: true, paymentAlerts: true, marketingEmails: false }),
  isActive: boolean('is_active').notNull().default(true),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const driverProfiles = pgTable('driver_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  fullName: text('full_name').notNull(),
  photoUrl: text('photo_url').notNull(),
  location: text('location').notNull(),
  serviceAreas: jsonb('service_areas').$type<string[]>().notNull(),
  yearsExperience: integer('years_experience').notNull(),
  bio: text('bio').notNull(),
  categories: jsonb('categories').$type<string[]>().notNull(),
  languages: jsonb('languages').$type<string[]>().notNull(),
  hourlyRateNgn: integer('hourly_rate_ngn').notNull(),
  dailyRateNgn: integer('daily_rate_ngn').notNull(),
  weeklyRateNgn: integer('weekly_rate_ngn').notNull(),
  monthlyRateNgn: integer('monthly_rate_ngn').notNull(),
  ratingAvg: numeric('rating_avg', { precision: 3, scale: 2 })
    .notNull()
    .default('4.90'),
  totalTrips: integer('total_trips').notNull().default(0),
  verificationStatus: text('verification_status').notNull().default('PENDING'), // PENDING | VERIFIED | REJECTED
  availabilityStatus: text('availability_status').notNull().default('AVAILABLE'), // AVAILABLE | BUSY | OFFLINE
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const driverDocuments = pgTable('driver_documents', {
  id: serial('id').primaryKey(),
  driverId: integer('driver_id')
    .references(() => driverProfiles.id, { onDelete: 'cascade' })
    .notNull(),
  docType: text('doc_type').notNull(), // DRIVERS_LICENSE | LASDRI_CERT | NIN_ID | BACKGROUND_CHECK
  documentNumber: text('document_number').notNull(),
  fileUrl: text('file_url'),
  status: text('status').notNull().default('PENDING'), // PENDING | VERIFIED | REJECTED
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const vehicleOwners = pgTable('vehicle_owners', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  companyName: text('company_name').notNull(),
  location: text('location').notNull(),
  contactPhone: text('contact_phone').notNull(),
  verificationStatus: text('verification_status').notNull().default('VERIFIED'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id')
    .references(() => vehicleOwners.id, { onDelete: 'cascade' })
    .notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  category: text('category').notNull(), // SUV | SEDAN | LUXURY | ECONOMY | VAN | BUS
  transmission: text('transmission').notNull(), // AUTOMATIC | MANUAL
  fuelType: text('fuel_type').notNull(),
  seats: integer('seats').notNull(),
  location: text('location').notNull(),
  plateNumber: text('plate_number').notNull(),
  description: text('description').notNull(),
  features: jsonb('features').$type<string[]>().notNull(),
  requirements: jsonb('requirements').$type<string[]>().notNull(),
  dailyRateNgn: integer('daily_rate_ngn').notNull(),
  weeklyRateNgn: integer('weekly_rate_ngn').notNull(),
  monthlyRateNgn: integer('monthly_rate_ngn').notNull(),
  chauffeurSurchargeDailyNgn: integer('chauffeur_surcharge_daily_ngn')
    .notNull()
    .default(18000),
  allowsSelfDrive: boolean('allows_self_drive').notNull().default(true),
  allowsChauffeur: boolean('allows_chauffeur').notNull().default(true),
  approvalStatus: text('approval_status').notNull().default('PENDING'), // PENDING | APPROVED | REJECTED
  availabilityStatus: text('availability_status').notNull().default('AVAILABLE'), // AVAILABLE | RENTED | MAINTENANCE
  primaryImageUrl: text('primary_image_url').notNull(),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const vehicleImages = pgTable('vehicle_images', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .references(() => vehicles.id, { onDelete: 'cascade' })
    .notNull(),
  imageUrl: text('image_url').notNull(),
  caption: text('caption'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const availabilityBlocks = pgTable('availability_blocks', {
  id: serial('id').primaryKey(),
  targetType: text('target_type').notNull(), // DRIVER | VEHICLE
  targetId: integer('target_id').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  reason: text('reason').notNull().default('UNAVAILABLE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  bookingCode: text('booking_code').notNull().unique(),
  customerId: integer('customer_id')
    .references(() => users.id)
    .notNull(),
  driverId: integer('driver_id').references(() => driverProfiles.id),
  vehicleId: integer('vehicle_id').references(() => vehicles.id),
  serviceType: text('service_type').notNull(), // DRIVER_HIRE | CAR_RENTAL | CHAUFFEUR_CAR | AIRPORT_TRANSFER | CORPORATE | INTERCITY | EVENT
  rentalOption: text('rental_option').notNull().default('CHAUFFEUR'), // SELF_DRIVE | CHAUFFEUR | DRIVER_ONLY
  durationUnit: text('duration_unit').notNull(), // HOURLY | DAILY | WEEKLY | MONTHLY
  durationCount: integer('duration_count').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  pickupLocation: text('pickup_location').notNull(),
  destination: text('destination'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email').notNull(),
  notes: text('notes'),
  subtotalNgn: integer('subtotal_ngn').notNull(),
  platformFeeNgn: integer('platform_fee_ngn').notNull(),
  totalAmountNgn: integer('total_amount_ngn').notNull(),
  status: text('status').notNull().default('AWAITING_PAYMENT'), // PENDING | AWAITING_PAYMENT | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | REFUNDED
  driverDecision: text('driver_decision').default('PENDING'), // PENDING | ACCEPTED | REJECTED
  ownerDecision: text('owner_decision').default('PENDING'), // PENDING | ACCEPTED | REJECTED
  disputeStatus: text('dispute_status').default('NONE'), // NONE | OPEN | RESOLVED
  disputeReason: text('dispute_reason'),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bookingStatusLogs = pgTable('booking_status_logs', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .references(() => bookings.id, { onDelete: 'cascade' })
    .notNull(),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  changedByUserId: integer('changed_by_user_id').references(() => users.id),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .references(() => bookings.id, { onDelete: 'cascade' })
    .notNull(),
  reference: text('reference').notNull().unique(),
  provider: text('provider').notNull().default('PAYSTACK'),
  amountNgn: integer('amount_ngn').notNull(),
  currency: text('currency').notNull().default('NGN'),
  status: text('status').notNull().default('PENDING'), // PENDING | PAID | FAILED | REFUNDED
  channel: text('channel'),
  providerPayload: jsonb('provider_payload'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id').references(() => payments.id, {
    onDelete: 'cascade',
  }),
  bookingId: integer('booking_id')
    .references(() => bookings.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  type: text('type').notNull(), // CUSTOMER_PAYMENT | DRIVER_PAYOUT | OWNER_PAYOUT | PLATFORM_COMMISSION | REFUND
  amountNgn: integer('amount_ngn').notNull(),
  status: text('status').notNull().default('RECORDED'),
  reference: text('reference').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .references(() => bookings.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  customerId: integer('customer_id')
    .references(() => users.id)
    .notNull(),
  driverId: integer('driver_id').references(() => driverProfiles.id),
  vehicleId: integer('vehicle_id').references(() => vehicles.id),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull().default('GENERAL'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  linkUrl: text('link_url'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const platformSettings = pgTable('platform_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  driverProfile: one(driverProfiles, {
    fields: [users.id],
    references: [driverProfiles.userId],
  }),
  vehicleOwner: one(vehicleOwners, {
    fields: [users.id],
    references: [vehicleOwners.userId],
  }),
  bookings: many(bookings),
  notifications: many(notifications),
}));

export const driverProfilesRelations = relations(driverProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [driverProfiles.userId],
    references: [users.id],
  }),
  documents: many(driverDocuments),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const driverDocumentsRelations = relations(driverDocuments, ({ one }) => ({
  driver: one(driverProfiles, {
    fields: [driverDocuments.driverId],
    references: [driverProfiles.id],
  }),
}));

export const vehicleOwnersRelations = relations(vehicleOwners, ({ one, many }) => ({
  user: one(users, {
    fields: [vehicleOwners.userId],
    references: [users.id],
  }),
  vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(vehicleOwners, {
    fields: [vehicles.ownerId],
    references: [vehicleOwners.id],
  }),
  images: many(vehicleImages),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const vehicleImagesRelations = relations(vehicleImages, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleImages.vehicleId],
    references: [vehicles.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  customer: one(users, {
    fields: [bookings.customerId],
    references: [users.id],
  }),
  driver: one(driverProfiles, {
    fields: [bookings.driverId],
    references: [driverProfiles.id],
  }),
  vehicle: one(vehicles, {
    fields: [bookings.vehicleId],
    references: [vehicles.id],
  }),
  statusLogs: many(bookingStatusLogs),
  payments: many(payments),
  review: one(reviews, {
    fields: [bookings.id],
    references: [reviews.bookingId],
  }),
}));
