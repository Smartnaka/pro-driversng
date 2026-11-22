import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { apiRequest } from '../lib/api';

export function ResetPasswordPage() {
  const [step, setStep] = useState<'REQUEST' | 'CONFIRM' | 'DONE'>('REQUEST');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim().includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<{
        message: string;
        previewCode?: string;
      }>('/api/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setMessage(res.message);
      if (res.previewCode) setPreviewCode(res.previewCode);
      setStep('CONFIRM');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to send reset.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string }>(
        '/api/auth/password-reset/confirm',
        {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim(),
            code: code.trim(),
            newPassword,
          }),
        }
      );
      setMessage(res.message);
      setStep('DONE');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid reset code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-[#111315]">
          Reset Password
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Verify your email to set a new ProDrivers password.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-[#F5F6F8] p-3 text-xs text-slate-700">
            <p>{message}</p>
            {previewCode ? (
              <p className="mt-1.5 font-mono font-semibold text-emerald-700">
                Preview Reset Code: {previewCode}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 'REQUEST' ? (
          <form onSubmit={handleRequest} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="reset-email"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Account Email Address
              </label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.ng"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Generating Code...' : 'Send Reset Code'}
            </Button>
          </form>
        ) : step === 'CONFIRM' ? (
          <form onSubmit={handleConfirm} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="reset-code"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Reset Code
              </label>
              <Input
                id="reset-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 8-character code"
                required
              />
            </div>
            <div>
              <label
                htmlFor="reset-new-password"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                New Password (8+ characters)
              </label>
              <div className="relative">
                <Input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        ) : (
          <div className="mt-6">
            <Link to="/login?reset=success">
              <Button variant="primary" className="w-full">
                Return to Sign In
              </Button>
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-600">
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
