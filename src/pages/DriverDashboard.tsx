import React, { useEffect, useState } from 'react';
import { Check, LogOut, ShieldCheck, X } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  StatusText,
  Textarea,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  formatDateTimeFull,
  formatNaira,
  LAGOS_LOCATIONS,
  type BookingRecord,
  type DriverProfile,
} from '../lib/format';

interface DriverDoc {
  id: number;
  docType: string;
  documentNumber: string;
  status: string;
  createdAt: string;
}

interface AvailabilityBlock {
  id: number;
  startDate: string;
  endDate: string;
  reason: string;
}

export function DriverDashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [documents, setDocuments] = useState<DriverDoc[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [earningsNgn, setEarningsNgn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('AVAILABLE');
  const [hourlyRateNgn, setHourlyRateNgn] = useState(4000);
  const [dailyRateNgn, setDailyRateNgn] = useState(25000);
  const [weeklyRateNgn, setWeeklyRateNgn] = useState(145000);
  const [monthlyRateNgn, setMonthlyRateNgn] = useState(500000);

  const [docType, setDocType] = useState('LASDRI_CERT');
  const [docNumber, setDocNumber] = useState('');

  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('Personal Leave');

  const loadDriver = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        profile: DriverProfile;
        documents: DriverDoc[];
        bookings: BookingRecord[];
        availabilityBlocks: AvailabilityBlock[];
        earningsNgn: number;
      }>('/api/driver/me');
      setProfile(res.profile);
      setDocuments(res.documents);
      setBookings(res.bookings);
      setBlocks(res.availabilityBlocks);
      setEarningsNgn(res.earningsNgn);

      setBio(res.profile.bio);
      setLocation(res.profile.location);
      setAvailabilityStatus(res.profile.availabilityStatus);
      setHourlyRateNgn(res.profile.hourlyRateNgn);
      setDailyRateNgn(res.profile.dailyRateNgn);
      setWeeklyRateNgn(res.profile.weeklyRateNgn);
      setMonthlyRateNgn(res.profile.monthlyRateNgn);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to load driver dashboard.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriver();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/api/driver/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          bio,
          location,
          availabilityStatus,
          hourlyRateNgn,
          dailyRateNgn,
          weeklyRateNgn,
          monthlyRateNgn,
        }),
      });
      setMessage('Driver profile and pricing updated.');
      loadDriver();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  async function handleUploadDocument(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/api/driver/documents', {
        method: 'POST',
        body: JSON.stringify({ docType, documentNumber: docNumber }),
      });
      setDocNumber('');
      setMessage('Verification document submitted for admin review.');
      loadDriver();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Document upload failed.');
    }
  }

  async function handleAddBlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/api/driver/availability', {
        method: 'POST',
        body: JSON.stringify({
          startDate: blockStart,
          endDate: blockEnd,
          reason: blockReason,
        }),
      });
      setBlockStart('');
      setBlockEnd('');
      setMessage('Unavailability window saved.');
      loadDriver();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to block dates.');
    }
  }

  async function handleDecision(bookingId: number, decision: 'ACCEPTED' | 'REJECTED') {
    setError(null);
    try {
      await apiRequest(`/api/driver/bookings/${bookingId}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setMessage(`Booking ${decision.toLowerCase()}.`);
      loadDriver();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    }
  }

  async function handleStatusTransition(bookingId: number, status: 'IN_PROGRESS' | 'COMPLETED') {
    setError(null);
    try {
      await apiRequest(`/api/driver/bookings/${bookingId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      setMessage(`Trip marked ${status.replace('_', ' ').toLowerCase()}.`);
      loadDriver();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status update failed.');
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Driver Workspace
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {user?.fullName} · Verification:{' '}
            <span className="font-semibold text-slate-900">
              {profile?.verificationStatus}
            </span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>

      {profile?.verificationStatus !== 'VERIFIED' ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold">Verification Required for Public Listing</p>
            <p className="mt-0.5 text-xs">
              Submit your FRSC Driver’s Licence, LASDRI certificate, and NIN below. Only verified drivers can appear in public search and accept confirmed bookings.
            </p>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Summary Metrics */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Tracked Earnings</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatNaira(earningsNgn)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Assigned Bookings</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {bookings.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Completed Trips</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {profile?.totalTrips ?? 0}
          </p>
        </Card>
      </div>

      {/* Booking Requests & Active Jobs */}
      <div className="mt-8 space-y-4">
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Booking Requests & Assigned Trips
        </h2>
        {bookings.length === 0 ? (
          <EmptyState
            title="No assigned bookings yet"
            description="Once customers request you for a Lagos trip or chauffeur assignment, requests appear here."
          />
        ) : (
          bookings.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-slate-900">
                      {b.bookingCode}
                    </span>
                    <StatusText status={b.status} />
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {b.customerName} · {b.customerPhone}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {b.pickupLocation} {b.destination ? `→ ${b.destination}` : ''} ·{' '}
                    {formatDateTimeFull(b.startDate)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-3 font-mono text-base font-bold text-slate-900 tabular-nums">
                    {formatNaira(b.subtotalNgn)}
                  </span>

                  {b.driverDecision === 'PENDING' && b.status !== 'CANCELLED' ? (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleDecision(b.id, 'ACCEPTED')}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Accept</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecision(b.id, 'REJECTED')}
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </Button>
                    </>
                  ) : null}

                  {b.status === 'CONFIRMED' && b.driverDecision === 'ACCEPTED' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatusTransition(b.id, 'IN_PROGRESS')}
                    >
                      Start Trip
                    </Button>
                  ) : null}

                  {b.status === 'IN_PROGRESS' ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleStatusTransition(b.id, 'COMPLETED')}
                    >
                      Mark Completed
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Profile, Rates & Verification Documents */}
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-7">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Profile, Availability & Naira Rates
          </h2>
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Primary Location
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
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Dispatch Status
                </label>
                <Select
                  value={availabilityStatus}
                  onChange={(e) => setAvailabilityStatus(e.target.value)}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="BUSY">Busy</option>
                  <option value="OFFLINE">Offline</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Professional Biography
              </label>
              <Textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Hourly (₦)
                </label>
                <Input
                  type="number"
                  value={hourlyRateNgn}
                  onChange={(e) => setHourlyRateNgn(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Daily (₦)
                </label>
                <Input
                  type="number"
                  value={dailyRateNgn}
                  onChange={(e) => setDailyRateNgn(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Weekly (₦)
                </label>
                <Input
                  type="number"
                  value={weeklyRateNgn}
                  onChange={(e) => setWeeklyRateNgn(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Monthly (₦)
                </label>
                <Input
                  type="number"
                  value={monthlyRateNgn}
                  onChange={(e) => setMonthlyRateNgn(Number(e.target.value))}
                />
              </div>
            </div>

            <Button type="submit" variant="primary">
              Save Profile & Rates
            </Button>
          </form>
        </Card>

        <div className="space-y-6 lg:col-span-5">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Verification Documents
            </h2>
            <form onSubmit={handleUploadDocument} className="mt-4 space-y-3">
              <Select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="DRIVERS_LICENSE">FRSC Driver’s Licence</option>
                <option value="LASDRI_CERT">LASDRI Certification</option>
                <option value="NIN_ID">National Identity (NIN)</option>
                <option value="BACKGROUND_CHECK">Police Background Clearance</option>
              </Select>
              <Input
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="Document / Licence Number"
                required
              />
              <Button type="submit" variant="secondary" size="sm">
                Submit Document
              </Button>
            </form>

            <div className="mt-4 divide-y divide-slate-100">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-2.5 text-xs"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {d.docType.replace(/_/g, ' ')}
                    </p>
                    <p className="font-mono text-slate-500">{d.documentNumber}</p>
                  </div>
                  <StatusText status={d.status} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Block Unavailable Dates
            </h2>
            <form onSubmit={handleAddBlock} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  required
                />
                <Input
                  type="date"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  required
                />
              </div>
              <Input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Reason (e.g. Personal Leave)"
              />
              <Button type="submit" variant="outline" size="sm">
                Block Dates
              </Button>
            </form>
            {blocks.length > 0 ? (
              <div className="mt-4 divide-y divide-slate-100 text-xs">
                {blocks.map((bl) => (
                  <div key={bl.id} className="flex justify-between py-2">
                    <span className="font-mono text-slate-700">
                      {new Date(bl.startDate).toLocaleDateString()} –{' '}
                      {new Date(bl.endDate).toLocaleDateString()}
                    </span>
                    <span className="text-slate-500">{bl.reason}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
