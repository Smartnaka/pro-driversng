import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  LogOut,
  MessageSquareWarning,
  Star,
} from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  Input,
  StatusText,
  Textarea,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  formatDateTimeFull,
  formatNaira,
  getStatusLabel,
  type BookingRecord,
} from '../lib/format';

interface PaymentRecord {
  id: number;
  bookingId: number;
  bookingCode: string;
  serviceType: string;
  pickupLocation: string;
  reference: string;
  amountNgn: number;
  status: string;
  channel: string | null;
  createdAt: string;
}

export function CustomerDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<'BOOKINGS' | 'PAYMENTS' | 'PROFILE'>('BOOKINGS');
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const [disputeBookingId, setDisputeBookingId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        apiRequest<{ bookings: BookingRecord[] }>('/api/bookings'),
        apiRequest<{ payments: PaymentRecord[] }>('/api/payments/my'),
      ]);
      setBookings(bRes.bookings);
      setPayments(pRes.payments);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const verifyRef = searchParams.get('verify_ref');
    if (verifyRef) {
      apiRequest('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({ reference: verifyRef }),
      })
        .then(() => {
          setBanner(`Paystack payment ${verifyRef} verified and confirmed.`);
          loadData();
        })
        .catch((err) =>
          setError(err instanceof Error ? err.message : 'Verification failed.')
        )
        .finally(() => {
          setSearchParams({});
        });
    }
  }, [searchParams]);

  async function handlePayNow(booking: BookingRecord) {
    setError(null);
    try {
      const init = await apiRequest<{
        mode: string;
        reference: string;
        authorizationUrl?: string;
      }>('/api/payments/initialize', {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking.id }),
      });

      if (init.authorizationUrl) {
        window.location.assign(init.authorizationUrl);
        return;
      }

      // Local test sandbox when PAYSTACK_SECRET_KEY is unconfigured
      await apiRequest('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({ reference: init.reference, sandboxConfirm: true }),
      });
      setBanner(`Test payment verified for ${booking.bookingCode}.`);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment error.');
    }
  }

  async function handleCancel(bookingId: number) {
    setError(null);
    try {
      await apiRequest(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
      setBanner('Booking cancelled.');
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to cancel booking.');
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewBookingId) return;
    setError(null);
    try {
      await apiRequest(`/api/bookings/${reviewBookingId}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });
      setReviewBookingId(null);
      setComment('');
      setBanner('Thank you! Your review has been published.');
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to submit review.');
    }
  }

  async function handleSubmitDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!disputeBookingId) return;
    setError(null);
    try {
      await apiRequest(`/api/bookings/${disputeBookingId}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ reason: disputeReason }),
      });
      setDisputeBookingId(null);
      setDisputeReason('');
      setBanner('Dispute submitted to ProDrivers Operations.');
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to submit dispute.');
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    try {
      await apiRequest('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, phone }),
      });
      await refreshUser();
      setBanner('Profile updated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Profile update failed.');
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Customer Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Signed in as {user?.fullName} ({user?.email})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/book">
            <Button variant="primary" size="sm">
              New Booking
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {[
          { id: 'BOOKINGS', label: `My Bookings (${bookings.length})` },
          { id: 'PAYMENTS', label: `Payments (${payments.length})` },
          { id: 'PROFILE', label: 'Profile' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as 'BOOKINGS' | 'PAYMENTS' | 'PROFILE')}
            className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {banner ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
          {banner}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {tab === 'BOOKINGS' ? (
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
          ) : bookings.length === 0 ? (
            <EmptyState
              title="No bookings yet"
              description="Hire a vetted Lagos driver or reserve a rental vehicle to see your trips here."
              action={
                <Link to="/book">
                  <Button variant="primary">Book Your First Trip</Button>
                </Link>
              }
            />
          ) : (
            bookings.map((b) => (
              <Card key={b.id} className="p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-slate-900">
                        {b.bookingCode}
                      </span>
                      <StatusText status={b.status} />
                      {b.disputeStatus === 'OPEN' ? (
                        <span className="text-xs font-medium text-amber-700">
                          · Dispute Open
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 font-display text-base font-semibold text-slate-900">
                      {getStatusLabel(b.serviceType)} · {b.durationCount}{' '}
                      {b.durationUnit.toLowerCase()}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">
                      {b.pickupLocation}
                      {b.destination ? ` → ${b.destination}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Starts {formatDateTimeFull(b.startDate)}
                      {b.driverName ? ` · Driver: ${b.driverName}` : ''}
                      {b.vehicleName ? ` · Vehicle: ${b.vehicleName}` : ''}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {formatNaira(b.totalAmountNgn)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
                      {b.status === 'AWAITING_PAYMENT' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handlePayNow(b)}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Complete Payment</span>
                        </Button>
                      ) : null}

                      {['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(
                        b.status
                      ) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(b.id)}
                        >
                          Cancel
                        </Button>
                      ) : null}

                      {b.status === 'COMPLETED' && !b.hasReview ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setReviewBookingId(b.id)}
                        >
                          <Star className="h-3.5 w-3.5" />
                          <span>Leave Review</span>
                        </Button>
                      ) : null}

                      {b.disputeStatus !== 'OPEN' &&
                      ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(
                        b.status
                      ) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDisputeBookingId(b.id)}
                        >
                          <MessageSquareWarning className="h-3.5 w-3.5" />
                          <span>Report Issue</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {reviewBookingId === b.id ? (
                  <form
                    onSubmit={handleSubmitReview}
                    className="mt-4 space-y-3 border-t border-slate-100 pt-4"
                  >
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-slate-700">
                        Rating:
                      </label>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          className={`rounded px-2 py-1 text-xs font-medium cursor-pointer ${
                            rating >= n
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {n} ★
                        </button>
                      ))}
                    </div>
                    <Textarea
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your feedback on punctuality, driving professionalism, and vehicle condition..."
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm">
                        Submit Review
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setReviewBookingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}

                {disputeBookingId === b.id ? (
                  <form
                    onSubmit={handleSubmitDispute}
                    className="mt-4 space-y-3 border-t border-slate-100 pt-4"
                  >
                    <Textarea
                      rows={2}
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Describe the issue for ProDrivers Operations review..."
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" variant="danger">
                        Open Dispute
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDisputeBookingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
              </Card>
            ))
          )}
        </div>
      ) : tab === 'PAYMENTS' ? (
        <div className="mt-6">
          {payments.length === 0 ? (
            <EmptyState
              title="No payment transactions yet"
              description="Your verified Paystack receipts and Naira booking payments will appear here."
            />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs text-slate-800">
                        {p.reference}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {p.bookingCode}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {p.channel || 'Paystack'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                        {formatNaira(p.amountNgn)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusText status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                        {formatDateTimeFull(p.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      ) : (
        <Card className="mt-6 max-w-xl p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Account Profile
          </h2>
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
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
              />
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
