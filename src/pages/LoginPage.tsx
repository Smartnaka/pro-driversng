import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { useAuth, type AppUser } from '../context/AuthContext';

export function getPostAuthRoute(user: AppUser, redirectParam?: string | null) {
  if (redirectParam && redirectParam.startsWith('/')) {
    return redirectParam;
  }
  if (!user.onboardingCompleted && user.role !== 'ADMIN') {
    return '/onboarding';
  }
  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'DRIVER') return '/dashboard/driver';
  if (user.role === 'VEHICLE_OWNER') return '/dashboard/owner';
  return '/dashboard';
}

export function LoginPage() {
  const { user, loginWithGoogle, loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const resetSuccess = searchParams.get('reset') === 'success';
  const deactivatedNotice = searchParams.get('deactivated') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    resetSuccess
      ? 'Your password has been updated. Sign in with your new credentials.'
      : deactivatedNotice
        ? 'Your account has been deactivated.'
        : null
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(getPostAuthRoute(user, redirectParam), { replace: true });
    }
  }, [user, navigate, redirectParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const signedUser = await loginWithPassword(trimmedEmail, password);
      navigate(getPostAuthRoute(signedUser, redirectParam), {
        replace: true,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const signedUser = await loginWithGoogle();
      navigate(getPostAuthRoute(signedUser, redirectParam), {
        replace: true,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
        <div className="hidden flex-col justify-between rounded-2xl border border-slate-200 bg-[#F5F6F8] p-8 lg:col-span-5 lg:flex">
          <div>
            <p className="text-xs font-medium text-emerald-700">
              ProDrivers Mobility Account
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#111315] text-balance">
              Manage trips, verified drivers, and rental fleets in one place.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Your single ProDrivers account routes directly to your customer bookings, driver dispatch workspace, or vehicle fleet portal.
            </p>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-6 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <span>
                Verified Paystack receipts and transparent Naira pricing breakdown on every reservation.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <span>
                Real-time driver and vehicle owner confirmations across Lagos and intercity routes.
              </span>
            </div>
          </div>
        </div>

        <Card className="p-6 sm:p-8 lg:col-span-7">
          <h1 className="font-display text-2xl font-bold text-[#111315]">
            Sign in to ProDrivers
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Access your customer bookings, driver dispatch, or fleet portal.
          </p>

          {success ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              {success}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={submitting}
              onClick={handleGoogle}
            >
              Continue with Google
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or with email</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Email Address
              </label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.ng"
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-xs font-medium text-slate-700"
                >
                  Password
                </label>
                <Link
                  to="/reset-password"
                  className="text-xs font-medium text-emerald-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-[#111315] cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-600">
            New to ProDrivers?{' '}
            <Link
              to="/register"
              className="font-semibold text-emerald-700 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
