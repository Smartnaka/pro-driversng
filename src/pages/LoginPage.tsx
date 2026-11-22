import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';
import { useAuth, type AppUser } from '../context/AuthContext';

function getRoleRedirect(role: AppUser['role']) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'DRIVER') return '/dashboard/driver';
  if (role === 'VEHICLE_OWNER') return '/dashboard/owner';
  return '/dashboard';
}

export function LoginPage() {
  const { user, loginWithGoogle, loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(redirectParam || getRoleRedirect(user.role), { replace: true });
    }
  }, [user, navigate, redirectParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const signedUser = await loginWithPassword(email, password);
      navigate(redirectParam || getRoleRedirect(signedUser.role), {
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
    setSubmitting(true);
    try {
      const signedUser = await loginWithGoogle();
      navigate(redirectParam || getRoleRedirect(signedUser.role), {
        replace: true,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Sign in to ProDrivers
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Access your customer bookings, driver dispatch, fleet portal, or admin console.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.ng"
              required
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Password
              </label>
              <Link
                to="/reset-password"
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
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
  );
}
