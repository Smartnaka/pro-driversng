import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui';

export function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
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
    { label: 'Hire a Driver', to: '/drivers' },
    { label: 'Rent a Car', to: '/cars' },
    { label: 'Book Trip', to: '/book' },
    {
      label: user?.role === 'ADMIN' ? 'Admin' : 'Dashboard',
      to: user ? dashboardHref : '/login',
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line brand wordmark */}
        <Link
          to="/"
          className="font-display text-2xl font-extrabold tracking-tight text-[#111315] whitespace-nowrap shrink-0"
        >
          ProDrivers
        </Link>

        {/* Zone 2: 4 concise single-line text links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          {navLinks.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#111315] ${
                  active
                    ? 'font-semibold text-[#111315] underline decoration-[#32BB78] decoration-2 underline-offset-8'
                    : ''
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <Link to={dashboardHref} className="hidden md:inline-flex">
              <Button variant="secondary" size="sm">
                {user.fullName.split(' ')[0]}
              </Button>
            </Link>
          ) : (
            <Link to="/login" className="hidden md:inline-flex">
              <Button variant="secondary" size="sm">
                Sign in
              </Button>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#111315] hover:bg-[#F5F6F8] md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1.5">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#F5F6F8] hover:text-[#111315]"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-slate-100 pt-3">
              {user ? (
                <Link
                  to={dashboardHref}
                  onClick={() => setMobileOpen(false)}
                  className="block"
                >
                  <Button variant="secondary" className="w-full">
                    Open {user.role === 'ADMIN' ? 'Admin Console' : 'Dashboard'}
                  </Button>
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block"
                >
                  <Button variant="primary" className="w-full">
                    Sign in or Register
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
