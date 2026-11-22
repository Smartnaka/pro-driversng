import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { LAGOS_LOCATIONS } from '../lib/format';
import { AVATAR_PRESETS, readImageFileAsDataUrl } from '../lib/media';
import { Button, Card, Input, SafeImage, Select } from './ui';

export function AccountSettingsPanel() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [defaultPickupLocation, setDefaultPickupLocation] = useState(
    user?.defaultPickupLocation || LAGOS_LOCATIONS[0]
  );
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [bookingAlerts, setBookingAlerts] = useState(
    user?.notificationPrefs?.bookingAlerts ?? true
  );
  const [paymentAlerts, setPaymentAlerts] = useState(
    user?.notificationPrefs?.paymentAlerts ?? true
  );
  const [marketingEmails, setMarketingEmails] = useState(
    user?.notificationPrefs?.marketingEmails ?? false
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await readImageFileAsDataUrl(file, 480);
      setAvatarUrl(dataUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load image.');
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSavingProfile(true);
    try {
      await apiRequest('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          avatarUrl: avatarUrl.trim() || null,
          defaultPickupLocation,
          notificationPrefs: {
            bookingAlerts,
            paymentAlerts,
            marketingEmails,
          },
        }),
      });
      await refreshUser();
      setMessage('Account details and notification preferences saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/me/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      await refreshUser();
      setMessage(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password update failed.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeactivate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDeactivating(true);
    try {
      await apiRequest('/api/auth/me/deactivate', {
        method: 'POST',
        body: JSON.stringify({ password: deactivatePassword }),
      });
      await logout();
      navigate('/login?deactivated=1', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to deactivate account.');
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-7">
          <h2 className="font-display text-lg font-semibold text-[#111315]">
            Personal Profile & Preferences
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Keep your contact information, avatar, and Lagos pickup preferences current.
          </p>

          <form onSubmit={handleSaveProfile} className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-5">
              <SafeImage
                src={avatarUrl || null}
                alt={fullName || 'Account avatar'}
                fallbackType="driver"
                className="h-16 w-16 rounded-full object-cover object-top border border-slate-200"
              />
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--pd-border-strong)] bg-[var(--pd-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--pd-ink)] transition-colors hover:bg-[var(--pd-surface-muted)]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleAvatarUpload}
                      className="sr-only"
                    />
                  </label>
                  {avatarUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAvatarUrl('')}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setAvatarUrl(preset.url)}
                      className={`h-8 w-8 overflow-hidden rounded-lg border-2 transition-colors cursor-pointer ${
                        avatarUrl === preset.url
                          ? 'border-[var(--pd-primary)]'
                          : 'border-transparent hover:border-[var(--pd-border-strong)]'
                      }`}
                      title={`Use ${preset.label}`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="h-full w-full object-cover object-top"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Full Name
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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
                />
              </div>
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
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Default Pickup Area
                </label>
                <Select
                  value={defaultPickupLocation}
                  onChange={(e) => setDefaultPickupLocation(e.target.value)}
                >
                  {LAGOS_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-[#111315]">
                Notification Preferences
              </p>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bookingAlerts}
                  onChange={(e) => setBookingAlerts(e.target.checked)}
                />
                <span>Booking confirmations, driver updates, and trip status alerts</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentAlerts}
                  onChange={(e) => setPaymentAlerts(e.target.checked)}
                />
                <span>Paystack payment verification receipts and payout notices</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingEmails}
                  onChange={(e) => setMarketingEmails(e.target.checked)}
                />
                <span>Corporate mobility offers and seasonal Lagos rate announcements</span>
              </label>
            </div>

            <Button type="submit" variant="primary" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Account Settings'}
            </Button>
          </form>
        </Card>

        <div className="space-y-6 lg:col-span-5">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-[#111315]">
              {user?.hasPassword ? 'Change Password' : 'Set Account Password'}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {user?.hasPassword
                ? 'Update your ProDrivers password (minimum 8 characters).'
                : 'Add a password so you can also sign in with email and password.'}
            </p>

            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              {user?.hasPassword ? (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Current Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw((p) => !p)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 cursor-pointer"
                      aria-label={showCurrentPw ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrentPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  New Password (8+ characters)
                </label>
                <div className="relative">
                  <Input
                    type={showNewPw ? 'text' : 'password'}
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw((p) => !p)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 cursor-pointer"
                    aria-label={showNewPw ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="secondary"
                disabled={savingPassword}
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </Card>

          {user?.role !== 'ADMIN' ? (
            <Card className="p-6">
              <h2 className="font-display text-base font-semibold text-[#111315]">
                Account Deactivation
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Deactivating your account disables sign-in and hides active partner listings while preserving booking records.
              </p>

              {!showDeactivateConfirm ? (
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeactivateConfirm(true)}
                  >
                    Deactivate Account
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleDeactivate} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium text-red-700">
                    Confirm account deactivation. You will be signed out immediately.
                  </p>
                  {user?.hasPassword ? (
                    <Input
                      type="password"
                      value={deactivatePassword}
                      onChange={(e) => setDeactivatePassword(e.target.value)}
                      placeholder="Enter your password to confirm"
                      required
                    />
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      variant="danger"
                      size="sm"
                      disabled={deactivating}
                    >
                      {deactivating ? 'Deactivating...' : 'Confirm Deactivation'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowDeactivateConfirm(false);
                        setDeactivatePassword('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
