import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStatusLabel } from '../lib/format';
import { ProDriversLogo } from './ProDriversLogo';
import { Button } from './ui';

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardHref =
    user?.role === 'ADMIN'
      ? '/admin'
      : user?.role === 'DRIVER'
        ? '/dashboard/driver'
        : user?.role === 'VEHICLE_OWNER'
          ? '/dashboard/owner'
          : '/dashboard';

  const navLinks = [
    { label: 'Hire a driver', to: '/drivers' },
    { label: 'Rent a car', to: '/cars' },
    { label: 'Book a trip', to: '/book' },
    user
      ? {
          label: user.role === 'ADMIN' ? 'Admin' : 'Dashboard',
          to: dashboardHref,
        }
      : {
          label: 'Become a partner',
          to: '/register?role=DRIVER',
        },
  ];

  async function handleSignOut() {
    await logout();
    setMobileOpen(false);
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--pd-border)] bg-[var(--pd-surface)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:gap-8 lg:px-8">
        {/* Zone 1: Brand wordmark */}
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-primary)] focus-visible:ring-offset-2"
        >
          <ProDriversLogo />
        </Link>

        {/* Zone 2: Single-line navigation links */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-5 lg:gap-8 text-sm font-medium text-[var(--pd-ink-muted)]"
        >
          {navLinks.map((item) => {
            const basePath = item.to.split('?')[0];
            const active =
              location.pathname === basePath ||
              (basePath !== '/' && location.pathname.startsWith(basePath));
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`rounded px-1 py-0.5 whitespace-nowrap shrink-0 transition-colors hover:text-[var(--pd-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-primary)] ${
                  active
                    ? 'font-semibold text-[var(--pd-ink)] underline decoration-[var(--pd-primary)] decoration-2 underline-offset-8'
                    : ''
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Auth actions & mobile trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <Link to={dashboardHref}>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-[var(--pd-surface-muted)] border-[var(--pd-border)] hover:border-[var(--pd-border-strong)]"
                >
                  <User className="h-3.5 w-3.5 text-[var(--pd-primary)]" />
                  <span className="max-w-[120px] truncate">
                    {user.fullName.split(' ')[0]}
                  </span>
                </Button>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className={
                    location.pathname === '/login'
                      ? 'bg-[var(--pd-surface-muted)]'
                      : ''
                  }
                >
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Sign up
                </Button>
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface)] text-[var(--pd-ink)] transition-colors hover:bg-[var(--pd-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-primary)] md:hidden cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div className="border-t border-[var(--pd-border)] bg-[var(--pd-surface)] px-4 pb-5 pt-3 md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {navLinks.map((item) => {
              const basePath = item.to.split('?')[0];
              const active =
                location.pathname === basePath ||
                (basePath !== '/' && location.pathname.startsWith(basePath));
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-lg px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-primary)] ${
                    active
                      ? 'bg-[var(--pd-primary-soft)] font-semibold text-[var(--pd-primary)]'
                      : 'font-medium text-[var(--pd-ink-muted)] hover:bg-[var(--pd-surface-muted)] hover:text-[var(--pd-ink)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 border-t border-[var(--pd-border)] pt-4">
            {user ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-[var(--pd-border)] bg-[var(--pd-bg)] px-3.5 py-2.5">
                  <p className="truncate font-display text-sm font-bold text-[var(--pd-ink)]">
                    {user.fullName}
                  </p>
                  <p className="text-xs text-[var(--pd-ink-subtle)]">
                    {getStatusLabel(user.role)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    to={dashboardHref}
                    onClick={() => setMobileOpen(false)}
                    className="block"
                  >
                    <Button variant="primary" size="md" className="h-11 w-full">
                      <User className="h-4 w-4" />
                      <span>
                        {user.role === 'ADMIN' ? 'Admin' : 'Dashboard'}
                      </span>
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleSignOut}
                    className="h-11 w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block"
                >
                  <Button variant="outline" size="md" className="h-11 w-full">
                    Sign in
                  </Button>
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block"
                >
                  <Button variant="primary" size="md" className="h-11 w-full">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
