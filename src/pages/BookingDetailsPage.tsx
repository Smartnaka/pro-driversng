import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Car,
  Check,
  CreditCard,
  LayoutDashboard,
  MapPin,
  MessageSquareWarning,
  ShieldCheck,
  Star,
  User,
  X,
} from 'lucide-react';
import { DashboardShell, type DashboardNavItem } from '../components/DashboardShell';
import {
  Button,
  Card,
  SafeImage,
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

interface BookingDetailResponse {
  booking: BookingRecord;
  driver: {
    id: number;
    fullName: string;
    photoUrl: string;
    location: string;
    yearsExperience: number;
    verificationStatus: string;
  } | null;
  vehicle: {
    id: number;
    make: string;
    model: string;
    year: number;
    plateNumber: string;
    location: string;
    primaryImageUrl: string;
    approvalStatus: string;
  } | null;
  statusLogs: {
    id: number;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }[];
  payments: {
    id: number;
    reference: string;
    provider: string;
    amountNgn: number;
    currency: string;
    status: string;
    channel: string | null;
    paidAt: string | null;
    createdAt: string;
  }[];
}

export function BookingDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [detail, setDetail] = useState<BookingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<BookingDetailResponse>(`/api/bookings/${id}`);
      setDetail(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load booking details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const dashboardRoute =
    user?.role === 'ADMIN'
      ? '/admin'
      : user?.role === 'DRIVER'
        ? '/dashboard/driver'
        : user?.role === 'VEHICLE_OWNER'
          ? '/dashboard/owner'
          : '/dashboard';

  const navItems: DashboardNavItem[] = [
    { id: 'back', label: 'Back to Dashboard', icon: LayoutDashboard, to: dashboardRoute },
    { id: 'detail', label: 'Booking Details', icon: Calendar },
  ];

  async function handlePayNow() {
    if (!detail) return;
    setBusyAction(true);
    setError(null);
    try {
      const init = await apiRequest<{
        mode: string;
        reference: string;
        authorizationUrl?: string;
      }>('/api/payments/initialize', {
        method: 'POST',
        body: JSON.stringify({ bookingId: detail.booking.id }),
      });

      if (init.authorizationUrl) {
        window.location.assign(init.authorizationUrl);
        return;
      }

      await apiRequest('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({ reference: init.reference, sandboxConfirm: true }),
      });
      setBanner(`Payment verified for booking ${detail.booking.bookingCode}.`);
      await loadDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment error.');
    } finally {
      setBusyAction(false);
    }
  }

  async function handleCancelBooking() {
    if (!detail) return;
    setBusyAction(true);
    setError(null);
    try {
      await apiRequest(`/api/bookings/${detail.booking.id}/cancel`, {
        method: 'POST',
      });
      setConfirmCancel(false);
      setBanner('Booking has been cancelled.');
      await loadDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to cancel booking.');
    } finally {
      setBusyAction(false);
    }
  }

  async function handleDriverDecision(decision: 'ACCEPTED' | 'REJECTED') {
    if (!detail) return;
    setBusyAction(true);
    setError(null);
    try {
      await apiRequest(`/api/driver/bookings/${detail.booking.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setBanner(`Assignment ${decision.toLowerCase()}.`);
      await loadDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Decision update failed.');
    } finally {
      setBusyAction(false);
    }
  }

  async function handleDriverStatus(status: 'IN_PROGRESS' | 'COMPLETED') {
    if (!detail) return;
    setBusyAction(true);
    setError(null);
    try {
      await apiRequest(`/api/driver/bookings/${detail.booking.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      setBanner(`Trip marked ${getStatusLabel(status)}.`);
      await loadDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setBusyAction(false);
    }
  }

  async function handleOwnerDecision(decision: 'ACCEPTED' | 'REJECTED') {
    if (!detail) return;
    setBusyAction(true);
    setError(null);
    try {
      await apiRequest(`/api/owner/bookings/${detail.booking.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setBanner(`Rental request ${decision.toLowerCase()}.`);
      await loadDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Decision update failed.');
    } finally {
      setBusyAction(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setBusyAction(true);
    setError(null);
    try {
      await apiRequest(`/api/bookings/${detail.booking.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });
      setShowReviewForm(false);
      setComment('');
      setBanner('Thank you! Your review has been published.');
      await loadDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to submit review.');
    } finally {
      setBusyAction(false);
    }
  }

  async function handleSubmitDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setBusyAction(true);
    setError(null);
    try {
      await apiRequest(`/api/bookings/${detail.booking.id}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ reason: disputeReason }),
      });
      setShowDisputeForm(false);
      setDisputeReason('');
      setBanner('Dispute submitted to ProDrivers Operations.');
      await loadDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to submit dispute.');
    } finally {
      setBusyAction(false);
    }
  }

  const booking = detail?.booking;
  const isCustomer = Boolean(user && booking && user.id === booking.customerId);

  return (
    <DashboardShell
      workspaceLabel="Reservations"
      sectionLabel={booking ? booking.bookingCode : 'Booking Details'}
      title={booking ? `Booking ${booking.bookingCode}` : 'Booking Details'}
      subtitle={
        booking
          ? `${getStatusLabel(booking.serviceType)} · ${getStatusLabel(booking.rentalOption)}`
          : 'Inspect trip schedule, pricing breakdown, and verified payment status.'
      }
      navItems={navItems}
      activeNav="detail"
      primaryAction={
        <Link to={dashboardRoute}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      }
    >
      {banner ? (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
          {banner}
        </div>
      ) : null}
      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : !detail || !booking ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-600">
            Booking record could not be displayed.
          </p>
          <div className="mt-4">
            <Link to={dashboardRoute}>
              <Button variant="primary" size="sm">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Main Details */}
          <div className="space-y-6 lg:col-span-8">
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-base font-bold text-[#111315]">
                      {booking.bookingCode}
                    </span>
                    <StatusText status={booking.status} />
                    {booking.disputeStatus === 'OPEN' ? (
                      <span className="text-xs font-medium text-amber-700">
                        · Dispute Open
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-slate-800">
                    {getStatusLabel(booking.serviceType)} · {booking.durationCount}{' '}
                    {booking.durationUnit.toLowerCase()}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-500">Total Amount</p>
                  <p className="font-mono text-xl font-bold text-[#111315] tabular-nums">
                    {formatNaira(booking.totalAmountNgn)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Pickup & Route</span>
                  </p>
                  <p className="font-medium text-[#111315]">
                    {booking.pickupLocation}
                    {booking.destination ? ` → ${booking.destination}` : ''}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Schedule Window</span>
                  </p>
                  <p className="font-mono text-xs font-medium text-[#111315] tabular-nums">
                    {formatDateTimeFull(booking.startDate)} →{' '}
                    {formatDateTimeFull(booking.endDate)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <User className="h-3.5 w-3.5" />
                    <span>Passenger Contact</span>
                  </p>
                  <p className="text-xs text-slate-800">
                    {booking.customerName} · {booking.customerPhone}
                    {booking.customerEmail ? ` · ${booking.customerEmail}` : ''}
                  </p>
                </div>

                {booking.notes ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">
                      Trip Instructions
                    </p>
                    <p className="text-xs text-slate-700">{booking.notes}</p>
                  </div>
                ) : null}
              </div>

              {/* Action Controls */}
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
                {isCustomer && booking.status === 'AWAITING_PAYMENT' ? (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busyAction}
                    onClick={handlePayNow}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Complete Payment</span>
                  </Button>
                ) : null}

                {isCustomer &&
                ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(
                  booking.status
                ) &&
                !confirmCancel ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyAction}
                    onClick={() => setConfirmCancel(true)}
                  >
                    Cancel Booking
                  </Button>
                ) : null}

                {isCustomer && booking.status === 'COMPLETED' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowReviewForm((p) => !p)}
                  >
                    <Star className="h-3.5 w-3.5" />
                    <span>Leave Review</span>
                  </Button>
                ) : null}

                {isCustomer &&
                booking.disputeStatus !== 'OPEN' &&
                ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status) ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDisputeForm((p) => !p)}
                  >
                    <MessageSquareWarning className="h-3.5 w-3.5" />
                    <span>Report Issue</span>
                  </Button>
                ) : null}

                {user?.role === 'DRIVER' &&
                booking.driverDecision === 'PENDING' &&
                booking.status !== 'CANCELLED' ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={busyAction}
                      onClick={() => handleDriverDecision('ACCEPTED')}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Accept Assignment</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyAction}
                      onClick={() => handleDriverDecision('REJECTED')}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </Button>
                  </>
                ) : null}

                {user?.role === 'DRIVER' &&
                booking.status === 'CONFIRMED' &&
                booking.driverDecision === 'ACCEPTED' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyAction}
                    onClick={() => handleDriverStatus('IN_PROGRESS')}
                  >
                    Start Trip
                  </Button>
                ) : null}

                {user?.role === 'DRIVER' && booking.status === 'IN_PROGRESS' ? (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busyAction}
                    onClick={() => handleDriverStatus('COMPLETED')}
                  >
                    Mark Completed
                  </Button>
                ) : null}

                {user?.role === 'VEHICLE_OWNER' &&
                booking.ownerDecision === 'PENDING' &&
                booking.status !== 'CANCELLED' ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={busyAction}
                      onClick={() => handleOwnerDecision('ACCEPTED')}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve Rental</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyAction}
                      onClick={() => handleOwnerDecision('REJECTED')}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Decline</span>
                    </Button>
                  </>
                ) : null}
              </div>

              {confirmCancel ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
                  <p className="text-xs font-medium text-red-900">
                    Confirm cancellation? Confirmed paid bookings record an automatic refund entry.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busyAction}
                      onClick={handleCancelBooking}
                    >
                      Confirm Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmCancel(false)}
                    >
                      Keep Booking
                    </Button>
                  </div>
                </div>
              ) : null}

              {showReviewForm ? (
                <form
                  onSubmit={handleSubmitReview}
                  className="mt-4 space-y-3 border-t border-slate-100 pt-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">Rating:</span>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer ${
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
                    placeholder="Share your feedback on driver professionalism and vehicle condition..."
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={busyAction}>
                      Submit Review
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowReviewForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : null}

              {showDisputeForm ? (
                <form
                  onSubmit={handleSubmitDispute}
                  className="mt-4 space-y-3 border-t border-slate-100 pt-4"
                >
                  <Textarea
                    rows={2}
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Describe the issue for ProDrivers Operations..."
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" variant="danger" disabled={busyAction}>
                      Open Dispute
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDisputeForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : null}
            </Card>

            {/* Assigned Driver & Vehicle */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {detail.driver ? (
                <Card className="p-5">
                  <p className="text-xs font-medium text-slate-500">Assigned Driver</p>
                  <div className="mt-3 flex items-center gap-3">
                    <SafeImage
                      src={detail.driver.photoUrl}
                      alt={detail.driver.fullName}
                      fallbackType="driver"
                      className="h-12 w-12 rounded-xl object-cover object-top"
                    />
                    <div>
                      <p className="font-display text-sm font-semibold text-[#111315]">
                        {detail.driver.fullName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {detail.driver.location} · {detail.driver.yearsExperience} yrs
                      </p>
                      <div className="mt-1">
                        <StatusText status={detail.driver.verificationStatus} />
                      </div>
                    </div>
                  </div>
                  {booking.driverDecision ? (
                    <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                      Driver response: {getStatusLabel(booking.driverDecision)}
                    </p>
                  ) : null}
                </Card>
              ) : null}

              {detail.vehicle ? (
                <Card className="p-5">
                  <p className="text-xs font-medium text-slate-500">Assigned Vehicle</p>
                  <div className="mt-3 flex items-center gap-3">
                    <SafeImage
                      src={detail.vehicle.primaryImageUrl}
                      alt={`${detail.vehicle.make} ${detail.vehicle.model}`}
                      fallbackType="car"
                      className="h-12 w-16 rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-display text-sm font-semibold text-[#111315]">
                        {detail.vehicle.year} {detail.vehicle.make} {detail.vehicle.model}
                      </p>
                      <p className="font-mono text-xs text-slate-500">
                        {detail.vehicle.plateNumber} · {detail.vehicle.location}
                      </p>
                      <div className="mt-1">
                        <StatusText status={detail.vehicle.approvalStatus} />
                      </div>
                    </div>
                  </div>
                  {booking.ownerDecision ? (
                    <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                      Owner response: {getStatusLabel(booking.ownerDecision)}
                    </p>
                  ) : null}
                </Card>
              ) : null}
            </div>

            {/* Payments Ledger */}
            <Card className="p-6">
              <h2 className="font-display text-base font-semibold text-[#111315]">
                Payment Records
              </h2>
              {detail.payments.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  No payment attempts recorded yet for this booking.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-2 pr-3 font-medium">Reference</th>
                        <th className="py-2 pr-3 font-medium">Channel</th>
                        <th className="py-2 pr-3 text-right font-medium">Amount</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 font-medium">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 pr-3 font-mono text-[#111315]">
                            {p.reference}
                          </td>
                          <td className="py-2.5 pr-3 text-slate-600">
                            {p.channel || 'Paystack'}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono font-medium tabular-nums">
                            {formatNaira(p.amountNgn)}
                          </td>
                          <td className="py-2.5 pr-3">
                            <StatusText status={p.status} />
                          </td>
                          <td className="py-2.5 font-mono text-slate-500 tabular-nums">
                            {formatDateTimeFull(p.paidAt || p.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Right Summary & Timeline */}
          <div className="space-y-6 lg:col-span-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-[#111315]">
                  Fare Breakdown
                </h2>
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Base Fare Subtotal</span>
                  <span className="font-mono font-medium text-[#111315] tabular-nums">
                    {formatNaira(booking.subtotalNgn)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Platform Service Fee</span>
                  <span className="font-mono font-medium text-[#111315] tabular-nums">
                    {formatNaira(booking.platformFeeNgn)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-bold text-[#111315]">
                  <span>Total</span>
                  <span className="font-mono tabular-nums">
                    {formatNaira(booking.totalAmountNgn)}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-base font-semibold text-[#111315]">
                Status Timeline
              </h2>
              {detail.statusLogs.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">No timeline entries yet.</p>
              ) : (
                <ol className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  {detail.statusLogs.map((log) => (
                    <li key={log.id} className="space-y-0.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#111315]">
                          {getStatusLabel(log.toStatus)}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {formatDateTimeFull(log.createdAt)}
                        </span>
                      </div>
                      {log.note ? (
                        <p className="text-slate-600">{log.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
