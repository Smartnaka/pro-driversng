import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Eye, EyeOff } from 'lucide-react';
import { Button, Card, Input, Select } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { LAGOS_LOCATIONS } from '../lib/format';
import { getPostAuthRoute } from './LoginPage';

const ROLE_OPTIONS: {
  id: 'CUSTOMER' | 'DRIVER' | 'VEHICLE_OWNER';
  label: string;
  summary: string;
}[] = [
  {
    id: 'CUSTOMER',
    label: 'Customer',
    summary: 'Hire vetted Lagos drivers, rent vehicles, and manage your trip payments.',
  },
  {
    id: 'DRIVER',
    label: 'Professional Driver',
    summary: 'List your driving profile, upload licence & LASDRI credentials, and accept trips.',
  },
  {
    id: 'VEHICLE_OWNER',
    label: 'Vehicle Owner',
    summary: 'Register vehicles for self-drive or chauffeur rentals and track fleet payouts.',
  },
];

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role');
  const validRole =
    initialRole === 'DRIVER' || initialRole === 'VEHICLE_OWNER'
      ? initialRole
      : 'CUSTOMER';

  const { registerAccount, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<'CUSTOMER' | 'DRIVER' | 'VEHICLE_OWNER'>(
    validRole
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+234 ');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useState(LAGOS_LOCATIONS[0]);
  const [companyName, setCompanyName] = useState('');
  const [yearsExperience, setYearsExperience] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (fullName.trim().length < 2) {
      setError('Enter your full name (at least 2 characters).');
      return;
    }
    if (!email.trim().includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 7) {
      setError('Enter a valid contact phone number.');
      return;
    }
    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await registerAccount({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim(),
        role,
        location,
        companyName: companyName.trim() || undefined,
        yearsExperience,
      });
      setSuccess('Account created. Taking you to onboarding...');
      navigate(getPostAuthRoute(created), { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to complete registration.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleRegister() {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const signed = await loginWithGoogle(role);
      navigate(getPostAuthRoute(signed), { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google Sign-Up failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const activeRoleInfo = ROLE_OPTIONS.find((r) => r.id === role)!;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-14">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-[#111315]">
          Create a ProDrivers Account
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Select your account type to tailor your onboarding and workspace.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-1.5 rounded-xl bg-[#F5F6F8] p-1">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRole(opt.id)}
              className={`rounded-lg px-2 py-2.5 text-xs font-medium transition-colors whitespace-nowrap truncate cursor-pointer ${
                role === opt.id
                  ? 'bg-white text-[#111315] shadow-sm'
                  : 'text-slate-600 hover:text-[#111315]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-slate-600">{activeRoleInfo.summary}</p>

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

        <div className="mt-5">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={submitting}
            onClick={handleGoogleRegister}
          >
            Continue with Google as {activeRoleInfo.label}
          </Button>
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">or register with email</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="reg-fullname"
              className="mb-1.5 block text-xs font-medium text-slate-700"
            >
              Full Name
            </label>
            <Input
              id="reg-fullname"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Chinedu Okafor"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="reg-email"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Email Address
              </label>
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.ng"
                required
              />
            </div>
            <div>
              <label
                htmlFor="reg-phone"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Phone Number
              </label>
              <Input
                id="reg-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 803 000 0000"
                required
              />
            </div>
          </div>

          {role !== 'CUSTOMER' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="reg-location"
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                >
                  Primary Lagos Base
                </label>
                <Select
                  id="reg-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  {LAGOS_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </Select>
              </div>
              {role === 'DRIVER' ? (
                <div>
                  <label
                    htmlFor="reg-exp"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    Years of Experience
                  </label>
                  <Input
                    id="reg-exp"
                    type="number"
                    min={1}
                    max={45}
                    value={yearsExperience}
                    onChange={(e) =>
                      setYearsExperience(Math.max(1, Number(e.target.value) || 1))
                    }
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="reg-company"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    Fleet / Company Name
                  </label>
                  <Input
                    id="reg-company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Lagos Executive Fleet Ltd"
                  />
                </div>
              )}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="reg-password"
              className="mb-1.5 block text-xs font-medium text-slate-700"
            >
              Password
            </label>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
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

            <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-3">
              {[
                { ok: hasMinLength, label: '8+ characters (required)' },
                { ok: hasLetter, label: 'Includes a letter' },
                { ok: hasNumber, label: 'Includes a number' },
              ].map((req) => (
                <div
                  key={req.label}
                  className={`flex items-center gap-1.5 ${
                    req.ok ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      req.ok ? 'opacity-100' : 'opacity-35'
                    }`}
                  />
                  <span>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? 'Creating Account...' : 'Create Account & Continue'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
