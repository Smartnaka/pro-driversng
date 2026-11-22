import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';
import { apiRequest } from '../lib/api';

export function ResetPasswordPage() {
  const [step, setStep] = useState<'REQUEST' | 'CONFIRM' | 'DONE'>('REQUEST');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiRequest<{
        message: string;
        previewCode?: string;
      }>('/api/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
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
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string }>(
        '/api/auth/password-reset/confirm',
        {
          method: 'POST',
          body: JSON.stringify({ email, code, newPassword }),
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
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Reset Password
        </h1>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
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
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Account Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Reset Code
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 8-character code"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                New Password (8+ characters)
              </label>
              <Input
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        ) : (
          <div className="mt-6">
            <Link to="/login">
              <Button variant="primary" className="w-full">
                Return to Sign In
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
