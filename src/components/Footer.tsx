import { Link } from 'react-router-dom';
import { Car, Lock, ShieldCheck } from 'lucide-react';
import { ProDriversLogo } from './ProDriversLogo';

export function Footer() {
  return (
    <footer className="border-t border-[var(--pd-border)] bg-[var(--pd-surface)]">
      {/* Slim Marketplace Trust Strip */}
      <div className="border-b border-[var(--pd-border)] bg-[var(--pd-bg)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 text-xs font-medium text-[var(--pd-ink-muted)] sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--pd-primary)]" />
              <span>Vetted drivers</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-[var(--pd-primary)]" />
              <span>Verified vehicles</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[var(--pd-accent)]" />
              <span>Secure payments via Paystack</span>
            </span>
          </div>
          <span className="font-mono text-[11px] text-[var(--pd-ink-subtle)]">
            All pricing in Naira (₦)
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link
              to="/"
              className="inline-block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-primary)]"
            >
              <ProDriversLogo />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-[var(--pd-ink-muted)]">
              Lagos-focused driver hiring and car rental marketplace for daily travel, business trips, and airport transfers.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-[var(--pd-ink)]">
              Services
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-[var(--pd-ink-muted)]">
              <li>
                <Link
                  to="/drivers"
                  className="hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:underline"
                >
                  Hire a driver
                </Link>
              </li>
              <li>
                <Link
                  to="/cars"
                  className="hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:underline"
                >
                  Rent a car
                </Link>
              </li>
              <li>
                <Link
                  to="/book?serviceType=CHAUFFEUR_CAR"
                  className="hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:underline"
                >
                  Chauffeur car
                </Link>
              </li>
              <li>
                <Link
                  to="/book?serviceType=AIRPORT_TRANSFER"
                  className="hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:underline"
                >
                  Airport transfer
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-[var(--pd-ink)]">
              Partners
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-[var(--pd-ink-muted)]">
              <li>
                <Link
                  to="/register?role=DRIVER"
                  className="hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:underline"
                >
                  Apply as a driver
                </Link>
              </li>
              <li>
                <Link
                  to="/register?role=VEHICLE_OWNER"
                  className="hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:underline"
                >
                  List your vehicles
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:underline"
                >
                  Partner sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-[var(--pd-ink)]">
              Account
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-[var(--pd-ink-muted)]">
              <li>
                <Link
                  to="/book"
                  className="hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:underline"
                >
                  Book a trip
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:underline"
                >
                  Customer dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:underline"
                >
                  Create account
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:underline"
                >
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[var(--pd-border)] pt-6 text-xs text-[var(--pd-ink-subtle)] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} ProDrivers Nigeria. All rights reserved.</p>
          <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--pd-border)] bg-[var(--pd-bg)] px-3 py-1.5 text-xs font-medium text-[var(--pd-ink)]">
            <Lock className="h-3.5 w-3.5 text-[var(--pd-primary)]" />
            <span>Secured by</span>
            <span className="font-display font-bold text-[var(--pd-primary)]">
              Paystack
            </span>
            <span className="text-[var(--pd-ink-subtle)]">· NGN (₦)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
