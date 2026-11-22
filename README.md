# ProDrivers — Driver Hiring & Car Rental Marketplace

**Tagline:** Your journey. Our professionals.  
**Initial Market:** Lagos, Nigeria

ProDrivers is a full-stack mobility marketplace connecting customers with LASDRI/FRSC-verified professional drivers and inspected rental vehicles across Victoria Island, Ikoyi, Lekki, Ikeja, and Lagos Mainland.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, React Router, Lucide Icons
- **Backend:** Express (`server.ts`) with Vite middleware in development
- **Database & ORM:** Cloud SQL (PostgreSQL) with Drizzle ORM & Drizzle Kit (`src/db/schema.ts`, `src/db/drizzle.config.ts`)
- **Authentication:** Firebase Auth (Google Sign-In) + server-verified email/password `scrypt` authentication with role-based access control (`CUSTOMER`, `DRIVER`, `VEHICLE_OWNER`, `ADMIN`)
- **Payments:** Paystack integration (`initialize`, `verify`, and HMAC-SHA512 webhook handler at `/api/payments/webhook/paystack`) with test-mode sandbox fallback when `PAYSTACK_SECRET_KEY` is unset
- **Maps:** Configurable Google Maps Embed preview via `VITE_GOOGLE_MAPS_API_KEY`

## Environment Variables

See `.env.example`:

- `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD` — Provisioned automatically by Cloud SQL
- `PAYSTACK_SECRET_KEY` — Optional Paystack test/live secret key (`sk_test_...`) for live Paystack checkout and webhook signature verification
- `PAYSTACK_PUBLIC_KEY` — Optional Paystack public key (`pk_test_...`)
- `VITE_GOOGLE_MAPS_API_KEY` — Optional public browser key for interactive Google Maps route embeds

## Setup & Scripts

```bash
# 1. Install dependencies
npm install

# 2. Push schema to PostgreSQL (via Drizzle Kit)
npx drizzle-kit push --config=src/db/drizzle.config.ts

# 3. Seed Nigerian demo marketplace data (runs idempotently on first API request too)
npm run seed

# 4. Run development server (port 3000)
npm run dev

# 5. Type-check & production build
npm run lint
npm run build
npm start
```

## Key Routes

- `/` — Marketplace landing page with interactive Lagos booking search
- `/drivers` & `/drivers/:id` — Verified driver marketplace and profiles
- `/cars` & `/cars/:id` — Approved car rental marketplace and vehicle details
- `/book` — Multi-step booking wizard with server-side Naira pricing & conflict locking
- `/dashboard` — Customer booking, payment, cancellation, dispute & review portal
- `/dashboard/driver` — Driver profile, verification documents, rate & trip management
- `/dashboard/owner` — Fleet owner vehicle registration, availability & booking approvals
- `/admin` — Operations console for driver verifications, vehicle approvals, disputes & commission rate
