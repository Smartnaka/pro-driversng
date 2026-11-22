import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Input, Select } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { LAGOS_LOCATIONS } from '../lib/format';

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
  const [location, setLocation] = useState(LAGOS_LOCATIONS[0]);
  const [companyName, setCompanyName] = useState('');
  const [yearsExperience, setYearsExperience] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function goDashboard(assignedRole: string) {
    if (assignedRole === 'DRIVER') navigate('/dashboard/driver');
    else if (assignedRole === 'VEHICLE_OWNER') navigate('/dashboard/owner');
    else navigate('/dashboard');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await registerAccount({
        email,
        password,
        fullName,
        phone,
        role,
        location,
        companyName,
        yearsExperience,
      });
      goDashboard(user.role);
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
    setSubmitting(true);
    try {
      const user = await loginWithGoogle(role);
      goDashboard(user.role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google Sign-Up failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Create a ProDrivers Account
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Join as a customer, professional driver, or vehicle fleet partner.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
          {[
            { id: 'CUSTOMER', label: 'Customer' },
            { id: 'DRIVER', label: 'Driver' },
            { id: 'VEHICLE_OWNER', label: 'Fleet Owner' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() =>
                setRole(opt.id as 'CUSTOMER' | 'DRIVER' | 'VEHICLE_OWNER')
              }
              className={`rounded-md py-2 text-xs font-medium transition-colors cursor-pointer ${
                role === opt.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
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
            Continue with Google as{' '}
            {role === 'DRIVER'
              ? 'Driver'
              : role === 'VEHICLE_OWNER'
                ? 'Fleet Owner'
                : 'Customer'}
          </Button>
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">or register with email</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Full Name
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Chinedu Okafor"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.ng"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Phone Number
              </label>
              <Input
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
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Primary Lagos Base
                </label>
                <Select
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
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Years of Experience
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={40}
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(Number(e.target.value) || 1)}
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Fleet / Company Name
                  </label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Lagos Executive Fleet Ltd"
                  />
                </div>
              )}
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Password (minimum 8 characters)
            </label>
            <Input
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
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
