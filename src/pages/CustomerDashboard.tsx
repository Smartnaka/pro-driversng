import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Car,
  CheckCheck,
  CreditCard,
  Lock,
  MessageSquareWarning,
  Search,
  ShieldCheck,
  Star,
  UserCheck,
} from 'lucide-react';
import { AccountSettingsPanel } from '../components/AccountSettingsPanel';
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
  type NotificationItem,
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
  paidAt: string | null;
  createdAt: string;
}

type CustomerTab = 'BOOKINGS' | 'PAYMENTS' | 'PROFILE';

export function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<CustomerTab>('BOOKINGS');
  const [bookingFilter, setBookingFilter] = useState<
    'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'
  >('ALL');
  const [bookingSearch, setBookingSearch] = useState('');

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const [disputeBookingId, setDisputeBookingId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, pRes, nRes] = await Promise.all([
        apiRequest<{ bookings: BookingRecord[] }>('/api/bookings'),
        apiRequest<{ payments: PaymentRecord[] }>('/api/payments/my'),
        apiRequest<{ notifications: NotificationItem[] }>('/api/notifications'),
      ]);
      setBookings(bRes.bookings);
      setPayments(pRes.payments);
      setNotifications(nRes.notifications);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const verifyRef = searchParams.get('verify_ref');
    if (verifyRef) {
      apiRequest('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({ reference: verifyRef }),
      })
        .then(() => {
          setBanner(`Paystack payment ${verifyRef} verified and confirmed.`);
          setTab('BOOKINGS');
          loadData();
        })
        .catch((err) =>
          setError(err instanceof Error ? err.message : 'Verification failed.')
        )
        .finally(() => {
          setSearchParams({});
        });
    }
  }, [searchParams, loadData, setSearchParams]);

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
      setConfirmCancelId(null);
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
      setBanner('Thank you. Your verified review has been published.');
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
      setBanner('Issue submitted to ProDrivers Operations.');
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to submit report.');
    }
  }

  async function handleNotificationAction(item: NotificationItem) {
    if (!item.isRead) {
      await apiRequest(`/api/notifications/${item.id}/read`, { method: 'PATCH' }).catch(
        () => undefined
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }
    if (item.linkUrl && item.linkUrl.startsWith('/')) {
      navigate(item.linkUrl);
    }
  }

  async function handleMarkAllRead() {
    await apiRequest('/api/notifications/read-all', { method: 'POST' }).catch(
      () => undefined
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  const upcomingBookings = bookings.filter((b) =>
    ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status)
  );
  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
  const cancelledBookings = bookings.filter((b) =>
    ['CANCELLED', 'REFUNDED'].includes(b.status)
  );
  const unreadNotifs = notifications.filter((n) => !n.isRead);

  const profileChecks = [
    { label: 'Full name', done: Boolean(user?.fullName) },
    { label: 'Phone number', done: Boolean(user?.phone && user.phone.trim().length > 5) },
    { label: 'Default pickup', done: Boolean(user?.defaultPickupLocation) },
    { label: 'Onboarding setup', done: Boolean(user?.onboardingCompleted) },
  ];
  const profilePct = Math.round(
    (profileChecks.filter((c) => c.done).length / profileChecks.length) * 100
  );

  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'UPCOMING') {
      if (!['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status)) {
        return false;
      }
    } else if (bookingFilter === 'COMPLETED') {
      if (b.status !== 'COMPLETED') return false;
    } else if (bookingFilter === 'CANCELLED') {
      if (!['CANCELLED', 'REFUNDED'].includes(b.status)) return false;
    }

    if (bookingSearch.trim()) {
      const q = bookingSearch.trim().toLowerCase();
      return (
        b.bookingCode.toLowerCase().includes(q) ||
        b.pickupLocation.toLowerCase().includes(q) ||
        (b.driverName || '').toLowerCase().includes(q) ||
        (b.vehicleName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const firstName = user?.fullName.split(' ')[0] || 'there';
  const showBookingsEmpty = !loading && tab === 'BOOKINGS' && bookings.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:py-10">
      {/* Greeting Header (no duplicate Sign Out; single "Book a trip" CTA) */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--pd-ink)] sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--pd-ink-muted)]">
            Manage your Lagos driver hires, rentals, and Naira receipts.
          </p>
        </div>

        <div className="shrink-0">
          <Link to="/book">
            <Button
              variant={showBookingsEmpty ? 'outline' : 'primary'}
              size="md"
              className="w-full sm:w-auto"
            >
              <span>Book a trip</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Slim Trust Row */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-[var(--pd-border)] pb-4 text-xs font-medium text-[var(--pd-ink-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--pd-primary)]" />
          <span>Vetted drivers</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Car className="h-3.5 w-3.5 text-[var(--pd-primary)]" />
          <span>Verified vehicles</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-[var(--pd-accent)]" />
          <span>Secure payments via Paystack</span>
        </span>
      </div>

      {/* Two Quick-Action Cards */}
      <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Link
          to="/drivers"
          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-primary)] focus-visible:ring-offset-2"
        >
          <Card className="flex items-center justify-between gap-4 p-4 transition-all duration-150 group-hover:border-[var(--pd-border-strong)] group-hover:shadow-sm sm:p-5">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--pd-primary-soft)] text-[var(--pd-primary)]">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-sm font-bold text-[var(--pd-ink)]">
                  Hire a driver
                </h2>
                <p className="mt-0.5 truncate text-xs text-[var(--pd-ink-muted)]">
                  Book an FRSC &amp; LASDRI-verified driver for your car.
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--pd-ink-subtle)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--pd-primary)]" />
          </Card>
        </Link>

        <Link
          to="/cars"
          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-primary)] focus-visible:ring-offset-2"
        >
          <Card className="flex items-center justify-between gap-4 p-4 transition-all duration-150 group-hover:border-[var(--pd-border-strong)] group-hover:shadow-sm sm:p-5">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--pd-accent-soft)] text-[var(--pd-accent)]">
                <Car className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-sm font-bold text-[var(--pd-ink)]">
                  Rent a car
                </h2>
                <p className="mt-0.5 truncate text-xs text-[var(--pd-ink-muted)]">
                  Daily or weekly sedans, SUVs, and vans across Lagos.
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--pd-ink-subtle)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--pd-primary)]" />
          </Card>
        </Link>
      </div>

      {/* Feedback Banners */}
      {banner ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {banner}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      {/* Unread Activity Strip (only rendered when unread alerts exist) */}
      {unreadNotifs.length > 0 ? (
        <Card className="mt-5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--pd-ink)]">
              <Bell className="h-3.5 w-3.5 text-[var(--pd-accent)]" />
              <span>Recent trip updates</span>
              <span className="rounded-full bg-[var(--pd-accent-soft)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--pd-accent)] tabular-nums">
                {unreadNotifs.length}
              </span>
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold text-[var(--pd-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-primary)] cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
          </div>
          <div className="mt-2.5 divide-y divide-[var(--pd-border)]">
            {unreadNotifs.slice(0, 2).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotificationAction(n)}
                className="flex w-full items-center justify-between gap-3 py-2 text-left transition-colors hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-primary)] cursor-pointer"
              >
                <span className="min-w-0 truncate text-xs text-[var(--pd-ink-muted)]">
                  <strong className="font-semibold text-[var(--pd-ink)]">
                    {n.title}:
                  </strong>{' '}
                  {n.message}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--pd-ink-subtle)]" />
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Tabs: Bookings, Payments, Profile (counts only shown when > 0) */}
      <div
        role="tablist"
        aria-label="Dashboard sections"
        className="mt-6 flex items-center gap-6 border-b border-[var(--pd-border)] overflow-x-auto"
      >
        {(
          [
            { id: 'BOOKINGS', label: 'Bookings', count: bookings.length },
            { id: 'PAYMENTS', label: 'Payments', count: payments.length },
            { id: 'PROFILE', label: 'Profile', count: 0 },
          ] as Array<{ id: CustomerTab; label: string; count: number }>
        ).map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 border-b-2 pb-3 pt-1 text-sm transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-primary)] cursor-pointer ${
                active
                  ? 'border-[var(--pd-primary)] font-semibold text-[var(--pd-ink)]'
                  : 'border-transparent font-medium text-[var(--pd-ink-muted)] hover:text-[var(--pd-ink)]'
              }`}
            >
              <span>{item.label}</span>
              {item.count > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                    active
                      ? 'bg-[var(--pd-primary-soft)] text-[var(--pd-primary)]'
                      : 'bg-[var(--pd-surface-muted)] text-[var(--pd-ink-muted)]'
                  }`}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-5">
        {tab === 'BOOKINGS' ? (
          loading ? (
            <Card className="p-5">
              <div className="space-y-3">
                <div className="h-5 w-40 animate-pulse rounded bg-[var(--pd-surface-muted)]" />
                <div className="h-16 animate-pulse rounded-lg bg-[var(--pd-surface-muted)]" />
              </div>
            </Card>
          ) : bookings.length === 0 ? (
            <Card className="px-5 py-8 text-center sm:px-8 sm:py-10">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--pd-primary-soft)] text-[var(--pd-primary)]">
                <Car className="h-5 w-5" />
              </div>
              <h2 className="mt-3.5 font-display text-lg font-bold text-[var(--pd-ink)]">
                No trips yet
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--pd-ink-muted)]">
                Hire a vetted driver or rent a car. Your trips will show up here.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link to="/drivers">
                  <Button variant="primary" size="md">
                    Hire a driver
                  </Button>
                </Link>
                <Link to="/cars">
                  <Button variant="outline" size="md">
                    Rent a car
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface)] p-1">
                  {[
                    { id: 'ALL', label: 'All', count: bookings.length },
                    { id: 'UPCOMING', label: 'Upcoming', count: upcomingBookings.length },
                    { id: 'COMPLETED', label: 'Completed', count: completedBookings.length },
                    { id: 'CANCELLED', label: 'Cancelled', count: cancelledBookings.length },
                  ].map((f) => {
                    const active = bookingFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          setBookingFilter(
                            f.id as 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-primary)] cursor-pointer ${
                          active
                            ? 'bg-[var(--pd-primary)] text-white'
                            : 'text-[var(--pd-ink-muted)] hover:bg-[var(--pd-surface-muted)] hover:text-[var(--pd-ink)]'
                        }`}
                      >
                        <span>{f.label}</span>
                        {f.count > 0 ? (
                          <span className="font-mono text-[11px] opacity-80 tabular-nums">
                            {f.count}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--pd-ink-subtle)]" />
                  <Input
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search code, pickup, driver..."
                    aria-label="Search bookings"
                    className="pl-9"
                  />
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <EmptyState
                  icon={<Search className="h-5 w-5" />}
                  title="No matching trips"
                  description="Clear your search or switch status filter to see all trips."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBookingFilter('ALL');
                        setBookingSearch('');
                      }}
                    >
                      Reset filters
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3.5">
                  {filteredBookings.map((b) => (
                    <Card
                      key={b.id}
                      className="p-4 transition-shadow duration-150 hover:shadow-sm sm:p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <Link
                              to={`/dashboard/bookings/${b.id}`}
                              className="font-mono text-xs font-bold text-[var(--pd-ink)] hover:text-[var(--pd-primary)] focus-visible:outline-none focus-visible:underline"
                            >
                              {b.bookingCode}
                            </Link>
                            <StatusText status={b.status} />
                            {b.disputeStatus === 'OPEN' ? (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                Dispute Open
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-2 font-display text-base font-bold text-[var(--pd-ink)]">
                            {getStatusLabel(b.serviceType)} · {b.durationCount}{' '}
                            {b.durationUnit.toLowerCase()}
                          </h3>

                          <p className="mt-1 text-xs text-[var(--pd-ink-muted)]">
                            {b.pickupLocation}
                            {b.destination ? ` → ${b.destination}` : ''}
                          </p>

                          <p className="mt-1 text-xs text-[var(--pd-ink-subtle)]">
                            {formatDateTimeFull(b.startDate)}
                            {b.driverName ? ` · Driver: ${b.driverName}` : ''}
                            {b.vehicleName ? ` · Vehicle: ${b.vehicleName}` : ''}
                          </p>
                        </div>

                        <div className="shrink-0 text-left sm:text-right">
                          <p className="font-mono text-lg font-bold text-[var(--pd-ink)] tabular-nums">
                            {formatNaira(b.totalAmountNgn)}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
                            <Link to={`/dashboard/bookings/${b.id}`}>
                              <Button size="sm" variant="outline">
                                View details
                              </Button>
                            </Link>

                            {b.status === 'AWAITING_PAYMENT' ? (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handlePayNow(b)}
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                <span>Pay {formatNaira(b.totalAmountNgn)}</span>
                              </Button>
                            ) : null}

                            {['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(
                              b.status
                            ) ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmCancelId(b.id)}
                              >
                                Cancel
                              </Button>
                            ) : null}

                            {b.status === 'COMPLETED' && !b.hasReview ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setReviewBookingId(b.id)}
                              >
                                <Star className="h-3.5 w-3.5 text-[var(--pd-accent)]" />
                                <span>Leave review</span>
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
                                <span>Report issue</span>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {confirmCancelId === b.id ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                          <p className="text-xs font-medium text-red-900">
                            Cancel booking {b.bookingCode}? Paid trips trigger a refund entry.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleCancel(b.id)}
                            >
                              Confirm cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmCancelId(null)}
                            >
                              Keep trip
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {reviewBookingId === b.id ? (
                        <form
                          onSubmit={handleSubmitReview}
                          className="mt-4 space-y-3 border-t border-[var(--pd-border)] pt-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--pd-ink)]">
                              Rating:
                            </span>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setRating(n)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                                  rating >= n
                                    ? 'bg-[var(--pd-accent-soft)] text-[var(--pd-accent)]'
                                    : 'bg-[var(--pd-surface-muted)] text-[var(--pd-ink-subtle)]'
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
                            placeholder="Share feedback on punctuality, driving, and vehicle condition..."
                            required
                          />
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" variant="primary">
                              Submit review
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
                          className="mt-4 space-y-3 border-t border-[var(--pd-border)] pt-4"
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
                              Submit report
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
                  ))}
                </div>
              )}
            </div>
          )
        ) : tab === 'PAYMENTS' ? (
          payments.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-5 w-5" />}
              title="No payments yet"
              description="Your verified Paystack receipts and Naira (₦) transactions will show up here."
              action={
                <Link to="/book">
                  <Button variant="outline" size="md">
                    Book a trip
                  </Button>
                </Link>
              }
            />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--pd-border)] bg-[var(--pd-bg)] text-xs font-semibold text-[var(--pd-ink-muted)]">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3 text-right">Amount (₦)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--pd-border)]">
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-[var(--pd-bg)]"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[var(--pd-ink)]">
                        {p.reference}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          to={`/dashboard/bookings/${p.bookingId}`}
                          className="font-semibold text-[var(--pd-primary)] hover:underline"
                        >
                          {p.bookingCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--pd-ink-muted)]">
                        {p.channel || 'Paystack'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-[var(--pd-ink)] tabular-nums">
                        {formatNaira(p.amountNgn)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusText status={p.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--pd-ink-subtle)] tabular-nums">
                        {formatDateTimeFull(p.paidAt || p.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )
        ) : (
          <div className="space-y-5">
            {profilePct < 100 ? (
              <Card className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                <div>
                  <p className="text-xs font-semibold text-[var(--pd-accent)]">
                    Profile {profilePct}% complete
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-[var(--pd-ink)]">
                    Add your{' '}
                    {profileChecks
                      .filter((c) => !c.done)
                      .map((c) => c.label.toLowerCase())
                      .join(', ')}{' '}
                    for faster Lagos pickups.
                  </p>
                </div>
                <Link to="/onboarding">
                  <Button size="sm" variant="outline">
                    Complete setup
                  </Button>
                </Link>
              </Card>
            ) : null}

            <AccountSettingsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
