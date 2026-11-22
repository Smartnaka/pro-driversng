import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CalendarOff,
  Check,
  DollarSign,
  FileCheck2,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { AccountSettingsPanel } from '../components/AccountSettingsPanel';
import { DashboardShell, type DashboardNavItem } from '../components/DashboardShell';
import {
  Button,
  Card,
  EmptyState,
  Input,
  SafeImage,
  Select,
  StatusText,
  Textarea,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  formatDateTimeFull,
  formatNaira,
  getStatusLabel,
  LAGOS_LOCATIONS,
  type BookingRecord,
  type DriverProfile,
} from '../lib/format';
import {
  AVATAR_PRESETS,
  readDocumentFileAsDataUrl,
  readImageFileAsDataUrl,
} from '../lib/media';

interface DriverDoc {
  id: number;
  docType: string;
  documentNumber: string;
  fileUrl: string | null;
  status: string;
  createdAt: string;
}

interface AvailabilityBlock {
  id: number;
  startDate: string;
  endDate: string;
  reason: string;
}

interface DriverLedgerItem {
  bookingId: number;
  bookingCode: string;
  serviceType: string;
  status: string;
  reference: string;
  paidAt: string;
  grossSubtotalNgn: number;
  platformFeeNgn: number;
  driverShareNgn: number;
}

type DriverTab = 'OVERVIEW' | 'JOBS' | 'AVAILABILITY' | 'EARNINGS' | 'PROFILE' | 'SETTINGS';

const DRIVER_CATEGORIES = [
  'Executive Chauffeur',
  'Corporate Fleet',
  'Airport Protocol',
  'Intercity Travel',
  'Family & School Runs',
];

export function DriverDashboard() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<DriverTab>('OVERVIEW');
  const [jobFilter, setJobFilter] = useState<'ALL' | 'PENDING' | 'UPCOMING' | 'COMPLETED'>('ALL');

  const [profile, setProfile] = useState<(DriverProfile & { phone?: string | null }) | null>(null);
  const [documents, setDocuments] = useState<DriverDoc[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [completedEarningsNgn, setCompletedEarningsNgn] = useState(0);
  const [pendingEarningsNgn, setPendingEarningsNgn] = useState(0);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
  const [earningsLedger, setEarningsLedger] = useState<DriverLedgerItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable Profile State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [yearsExperience, setYearsExperience] = useState(3);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState(LAGOS_LOCATIONS[0]);
  const [availabilityStatus, setAvailabilityStatus] = useState('AVAILABLE');
  const [categories, setCategories] = useState<string[]>([]);
  const [languagesInput, setLanguagesInput] = useState('');
  const [hourlyRateNgn, setHourlyRateNgn] = useState(4000);
  const [dailyRateNgn, setDailyRateNgn] = useState(25000);
  const [weeklyRateNgn, setWeeklyRateNgn] = useState(145000);
  const [monthlyRateNgn, setMonthlyRateNgn] = useState(500000);

  // Verification Docs
  const [docType, setDocType] = useState('LASDRI_CERT');
  const [docNumber, setDocNumber] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');

  // Availability Block Form
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('Personal Leave');

  const loadDriver = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        profile: DriverProfile & { phone?: string | null };
        documents: DriverDoc[];
        bookings: BookingRecord[];
        availabilityBlocks: AvailabilityBlock[];
        completedEarningsNgn: number;
        pendingEarningsNgn: number;
        completedJobsCount: number;
        earningsLedger: DriverLedgerItem[];
      }>('/api/driver/me');

      setProfile(res.profile);
      setDocuments(res.documents);
      setBookings(res.bookings);
      setBlocks(res.availabilityBlocks);
      setCompletedEarningsNgn(res.completedEarningsNgn || 0);
      setPendingEarningsNgn(res.pendingEarningsNgn || 0);
      setCompletedJobsCount(res.completedJobsCount || 0);
      setEarningsLedger(res.earningsLedger || []);

      setFullName(res.profile.fullName);
      setPhone(res.profile.phone || user?.phone || '');
      setPhotoUrl(res.profile.photoUrl);
      setYearsExperience(res.profile.yearsExperience);
      setBio(res.profile.bio);
      setLocation(res.profile.location);
      setAvailabilityStatus(res.profile.availabilityStatus);
      setCategories(res.profile.categories || []);
      setLanguagesInput((res.profile.languages || []).join(', '));
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
  }, [user?.phone]);

  useEffect(() => {
    loadDriver();
  }, [loadDriver]);

  async function handleQuickAvailability(nextStatus: string) {
    setError(null);
    setAvailabilityStatus(nextStatus);
    try {
      await apiRequest('/api/driver/profile', {
        method: 'PATCH',
        body: JSON.stringify({ availabilityStatus: nextStatus }),
      });
      setMessage(`Availability status updated to ${getStatusLabel(nextStatus)}.`);
      loadDriver();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiRequest('/api/driver/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          photoUrl: photoUrl.trim() || undefined,
          yearsExperience,
          bio,
          location,
          availabilityStatus,
          categories,
          languages: languagesInput
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          hourlyRateNgn,
          dailyRateNgn,
          weeklyRateNgn,
          monthlyRateNgn,
        }),
      });
      await refreshUser();
      setMessage('Driver profile, qualifications, and Naira rates saved.');
      loadDriver();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  async function handleUploadDocument(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiRequest('/api/driver/documents', {
        method: 'POST',
        body: JSON.stringify({
          docType,
          documentNumber: docNumber.trim(),
          fileUrl: docFileUrl || undefined,
        }),
      });
      setDocNumber('');
      setDocFileUrl('');
      setMessage('Verification document submitted for admin review.');
      loadDriver();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Document upload failed.');
    }
  }

  async function handleAddBlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
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

  async function handleDeleteBlock(blockId: number) {
    setError(null);
    try {
      await apiRequest(`/api/driver/availability/${blockId}`, {
        method: 'DELETE',
      });
      setMessage('Availability block removed.');
      loadDriver();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to remove block.');
    }
  }

  async function handleDecision(bookingId: number, decision: 'ACCEPTED' | 'REJECTED') {
    setError(null);
    setMessage(null);
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

  async function handleStatusTransition(
    bookingId: number,
    status: 'IN_PROGRESS' | 'COMPLETED'
  ) {
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/api/driver/bookings/${bookingId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      setMessage(`Trip marked ${getStatusLabel(status).toLowerCase()}.`);
      loadDriver();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status update failed.');
    }
  }

  const pendingRequests = bookings.filter(
    (b) => b.driverDecision === 'PENDING' && !['CANCELLED', 'REFUNDED'].includes(b.status)
  );
  const upcomingAssignments = bookings.filter((b) =>
    ['CONFIRMED', 'IN_PROGRESS'].includes(b.status)
  );
  const pastJobs = bookings.filter((b) =>
    ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(b.status)
  );

  const filteredJobs = bookings.filter((b) => {
    if (jobFilter === 'PENDING') {
      return b.driverDecision === 'PENDING' && !['CANCELLED', 'REFUNDED'].includes(b.status);
    }
    if (jobFilter === 'UPCOMING') {
      return ['CONFIRMED', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(b.status);
    }
    if (jobFilter === 'COMPLETED') {
      return ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(b.status);
    }
    return true;
  });

  const completionSteps = [
    Boolean(profile?.photoUrl),
    Boolean(profile?.phone && profile.phone.length > 5),
    Boolean(profile?.bio && profile.bio.length > 20),
    documents.length > 0,
    profile?.verificationStatus === 'VERIFIED',
  ];
  const completionPct = Math.round(
    (completionSteps.filter(Boolean).length / completionSteps.length) * 100
  );

  const navItems: DashboardNavItem[] = [
    { id: 'OVERVIEW', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'JOBS',
      label: 'Jobs & Assignments',
      icon: Calendar,
      badge: pendingRequests.length > 0 ? pendingRequests.length : undefined,
    },
    { id: 'AVAILABILITY', label: 'Availability', icon: CalendarOff },
    { id: 'EARNINGS', label: 'Earnings', icon: DollarSign },
    { id: 'PROFILE', label: 'Profile & Docs', icon: UserCheck },
    { id: 'SETTINGS', label: 'Account Settings', icon: Settings },
  ];

  const sectionLabels: Record<DriverTab, string> = {
    OVERVIEW: 'Overview',
    JOBS: 'Jobs & Assignments',
    AVAILABILITY: 'Availability',
    EARNINGS: 'Earnings',
    PROFILE: 'Profile & Verification',
    SETTINGS: 'Account Settings',
  };

  return (
    <DashboardShell
      workspaceLabel="Driver Workspace"
      sectionLabel={sectionLabels[tab]}
      title={`Driver Console · ${profile?.fullName || user?.fullName || ''}`}
      subtitle="Manage assignments, availability windows, verification documents, and verified payouts."
      navItems={navItems}
      activeNav={tab}
      onNavChange={(id) => setTab(id as DriverTab)}
      primaryAction={
        <div className="flex items-center gap-2">
          <Select
            aria-label="Driver availability status"
            value={availabilityStatus}
            onChange={(e) => handleQuickAvailability(e.target.value)}
            className="h-9 py-1.5 text-xs bg-white w-36"
          >
            <option value="AVAILABLE">Available</option>
            <option value="BUSY">Busy</option>
            <option value="OFFLINE">Offline</option>
          </Select>
        </div>
      }
    >
      {message ? (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : tab === 'OVERVIEW' ? (
        <div className="space-y-6">
          {/* Verification Status Banner */}
          {profile?.verificationStatus !== 'VERIFIED' ? (
            <Card className="border-amber-200 bg-amber-50/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-semibold text-[#111315]">
                        Verification Status:
                      </p>
                      <StatusText status={profile?.verificationStatus || 'PENDING'} />
                    </div>
                    <p className="mt-1 text-xs text-slate-700">
                      Submit your FRSC Driver’s Licence, LASDRI certificate, and NIN. Only verified drivers appear in public marketplace search and can accept confirmed bookings.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setTab('PROFILE')}
                >
                  Manage Documents
                </Button>
              </div>
            </Card>
          ) : null}

          {/* Profile Completion + Status */}
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Driver Readiness · <span className="font-mono">{completionPct}%</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <StatusText status={profile?.verificationStatus || 'PENDING'} />
                  <span className="text-xs text-slate-400">·</span>
                  <StatusText status={availabilityStatus} />
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-600">{profile?.location}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['AVAILABLE', 'BUSY', 'OFFLINE'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleQuickAvailability(st)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                      availabilityStatus === st
                        ? 'bg-[#111315] text-white'
                        : 'bg-[#F5F6F8] text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    {getStatusLabel(st)}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Completed Earnings</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {formatNaira(completedEarningsNgn)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Pending / Active Earnings</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {formatNaira(pendingEarningsNgn)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Completed Jobs</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {completedJobsCount}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Upcoming Assignments</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {upcomingAssignments.length}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="p-6 lg:col-span-7">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-[#111315]">
                  Upcoming & Pending Assignments
                </h2>
                <button
                  type="button"
                  onClick={() => setTab('JOBS')}
                  className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
                >
                  Open Jobs
                </button>
              </div>
              {upcomingAssignments.length === 0 && pendingRequests.length === 0 ? (
                <p className="mt-4 text-xs text-slate-500">
                  No upcoming assignments yet. Keep your availability set to Available.
                </p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {[...pendingRequests, ...upcomingAssignments]
                    .slice(0, 4)
                    .map((b) => (
                      <div
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/dashboard/bookings/${b.id}`}
                              className="font-mono text-xs font-semibold text-[#111315] hover:text-emerald-700"
                            >
                              {b.bookingCode}
                            </Link>
                            <StatusText status={b.status} />
                          </div>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {b.customerName} · {b.pickupLocation}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400 tabular-nums">
                            {formatDateTimeFull(b.startDate)}
                          </p>
                        </div>
                        <Link to={`/dashboard/bookings/${b.id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                      </div>
                    ))}
                </div>
              )}
            </Card>

            <Card className="p-6 lg:col-span-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-[#111315]">
                  Recent Completed Jobs
                </h2>
                <button
                  type="button"
                  onClick={() => setTab('EARNINGS')}
                  className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
                >
                  Earnings
                </button>
              </div>
              {pastJobs.filter((b) => b.status === 'COMPLETED').length === 0 ? (
                <p className="mt-4 text-xs text-slate-500">
                  Completed trips and client ratings will appear here.
                </p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {pastJobs
                    .filter((b) => b.status === 'COMPLETED')
                    .slice(0, 4)
                    .map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-2 py-3 text-xs"
                      >
                        <div>
                          <p className="font-mono font-semibold text-[#111315]">
                            {b.bookingCode}
                          </p>
                          <p className="text-slate-500">{b.pickupLocation}</p>
                        </div>
                        <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                          {formatNaira(b.subtotalNgn)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : tab === 'JOBS' ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
            {[
              { id: 'ALL', label: `All (${bookings.length})` },
              { id: 'PENDING', label: `Pending Requests (${pendingRequests.length})` },
              { id: 'UPCOMING', label: `Upcoming (${upcomingAssignments.length})` },
              { id: 'COMPLETED', label: `Past (${pastJobs.length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() =>
                  setJobFilter(f.id as 'ALL' | 'PENDING' | 'UPCOMING' | 'COMPLETED')
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                  jobFilter === f.id
                    ? 'bg-[#111315] text-white'
                    : 'text-slate-600 hover:text-[#111315]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredJobs.length === 0 ? (
            <EmptyState
              title="No jobs in this view"
              description="Customer chauffeur bookings and dispatch requests matching this filter appear here."
            />
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((b) => (
                <Card key={b.id} className="p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          to={`/dashboard/bookings/${b.id}`}
                          className="font-mono text-sm font-semibold text-[#111315] hover:text-emerald-700"
                        >
                          {b.bookingCode}
                        </Link>
                        <StatusText status={b.status} />
                        {b.driverDecision ? (
                          <span className="text-xs text-slate-500">
                            · Response: {getStatusLabel(b.driverDecision)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {b.customerName} · {b.customerPhone}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {b.pickupLocation}
                        {b.destination ? ` → ${b.destination}` : ''} ·{' '}
                        {formatDateTimeFull(b.startDate)}
                        {b.vehicleName ? ` · Vehicle: ${b.vehicleName}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mr-2 font-mono text-base font-bold text-[#111315] tabular-nums">
                        {formatNaira(b.subtotalNgn)}
                      </span>
                      <Link to={`/dashboard/bookings/${b.id}`}>
                        <Button size="sm" variant="outline">
                          Details
                        </Button>
                      </Link>

                      {b.driverDecision === 'PENDING' &&
                      !['CANCELLED', 'REFUNDED', 'COMPLETED'].includes(b.status) ? (
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
              ))}
            </div>
          )}
        </div>
      ) : tab === 'AVAILABILITY' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="p-6 lg:col-span-5">
            <h2 className="font-display text-lg font-semibold text-[#111315]">
              Dispatch Availability Status
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Switch offline when you are unavailable for new customer assignments.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['AVAILABLE', 'BUSY', 'OFFLINE'].map((st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={availabilityStatus === st ? 'secondary' : 'outline'}
                  onClick={() => handleQuickAvailability(st)}
                >
                  {getStatusLabel(st)}
                </Button>
              ))}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="font-display text-base font-semibold text-[#111315]">
                Block Specific Dates
              </h3>
              <form onSubmit={handleAddBlock} className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">Start</label>
                    <Input
                      type="date"
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">End</label>
                    <Input
                      type="date"
                      value={blockEnd}
                      onChange={(e) => setBlockEnd(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Input
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Reason (e.g. Personal Leave)"
                />
                <Button type="submit" variant="primary" size="sm">
                  Save Blocked Dates
                </Button>
              </form>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-7">
            <h2 className="font-display text-lg font-semibold text-[#111315]">
              Scheduled Unavailable Windows ({blocks.length})
            </h2>
            {blocks.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No blocked dates"
                  description="All open dates are currently bookable when your dispatch status is Available."
                />
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {blocks.map((bl) => (
                  <div
                    key={bl.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
                  >
                    <div>
                      <p className="font-mono font-medium text-[#111315] tabular-nums">
                        {new Date(bl.startDate).toLocaleDateString('en-NG')} –{' '}
                        {new Date(bl.endDate).toLocaleDateString('en-NG')}
                      </p>
                      <p className="mt-0.5 text-slate-500">{bl.reason}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteBlock(bl.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      <span className="text-red-700">Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : tab === 'EARNINGS' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Completed Earnings</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {formatNaira(completedEarningsNgn)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Pending Escrowed Earnings</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {formatNaira(pendingEarningsNgn)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Completed Paid Jobs</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {completedJobsCount}
              </p>
            </Card>
          </div>

          {earningsLedger.length === 0 ? (
            <EmptyState
              title="No verified trip earnings yet"
              description="Confirmed bookings with verified customer Paystack payments will appear in your driver earnings ledger."
            />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Paystack Ref</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3 text-right">Driver Share</th>
                    <th className="px-4 py-3">Trip Status</th>
                    <th className="px-4 py-3">Paid Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {earningsLedger.map((item) => (
                    <tr key={item.bookingId} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          to={`/dashboard/bookings/${item.bookingId}`}
                          className="font-semibold text-emerald-700 hover:underline"
                        >
                          {item.bookingCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {item.reference}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {getStatusLabel(item.serviceType)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-[#111315] tabular-nums">
                        {formatNaira(item.driverShareNgn)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusText status={item.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums">
                        {formatDateTimeFull(item.paidAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      ) : tab === 'PROFILE' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="p-6 lg:col-span-7">
            <h2 className="font-display text-lg font-semibold text-[#111315]">
              Driver Profile, Qualifications & Rates
            </h2>
            <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-4">
                <SafeImage
                  src={photoUrl}
                  alt={fullName}
                  fallbackType="driver"
                  className="h-16 w-16 rounded-2xl border border-slate-200 object-cover object-top"
                />
                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#111315] hover:bg-[#F5F6F8]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          setPhotoUrl(await readImageFileAsDataUrl(f, 640));
                        } catch (err: unknown) {
                          setError(err instanceof Error ? err.message : 'Photo error.');
                        }
                      }}
                    />
                  </label>
                  <div className="flex gap-2">
                    {AVATAR_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setPhotoUrl(p.url)}
                        className={`h-8 w-8 overflow-hidden rounded-full border-2 cursor-pointer ${
                          photoUrl === p.url ? 'border-[#32BB78]' : 'border-transparent'
                        }`}
                      >
                        <img
                          src={p.url}
                          alt={p.label}
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
                    required
                  />
                </div>
              </div>

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
                    Years of Experience
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-slate-700">
                  Qualifications & Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {DRIVER_CATEGORIES.map((cat) => {
                    const active = categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setCategories((prev) =>
                            prev.includes(cat)
                              ? prev.filter((c) => c !== cat)
                              : [...prev, cat]
                          )
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                          active
                            ? 'border-[#111315] bg-[#111315] text-white'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Languages Spoken (comma-separated)
                </label>
                <Input
                  value={languagesInput}
                  onChange={(e) => setLanguagesInput(e.target.value)}
                />
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
                  <label className="mb-1 block text-xs text-slate-600">Hourly (₦)</label>
                  <Input
                    type="number"
                    value={hourlyRateNgn}
                    onChange={(e) => setHourlyRateNgn(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">Daily (₦)</label>
                  <Input
                    type="number"
                    value={dailyRateNgn}
                    onChange={(e) => setDailyRateNgn(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">Weekly (₦)</label>
                  <Input
                    type="number"
                    value={weeklyRateNgn}
                    onChange={(e) => setWeeklyRateNgn(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">Monthly (₦)</label>
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

          <Card className="p-6 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-[#111315]">
                Verification Documents
              </h2>
              <StatusText status={profile?.verificationStatus || 'PENDING'} />
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Upload your FRSC Driver’s Licence, LASDRI certificate, NIN, and Police Background Clearance.
            </p>

            <form onSubmit={handleUploadDocument} className="mt-4 space-y-3">
              <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
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
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#111315] hover:bg-[#F5F6F8]">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  <span>{docFileUrl ? 'File Attached' : 'Attach Scan (Optional)'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        setDocFileUrl(await readDocumentFileAsDataUrl(f));
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : 'File error.');
                      }
                    }}
                  />
                </label>
                <Button type="submit" variant="secondary" size="sm">
                  Submit Document
                </Button>
              </div>
            </form>

            <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
              {documents.length === 0 ? (
                <p className="py-4 text-xs text-slate-500">
                  No documents submitted yet.
                </p>
              ) : (
                documents.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between py-3 text-xs"
                  >
                    <div>
                      <p className="font-medium text-[#111315]">
                        {d.docType.replace(/_/g, ' ')}
                      </p>
                      <p className="font-mono text-slate-500">{d.documentNumber}</p>
                    </div>
                    <StatusText status={d.status} />
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : (
        <AccountSettingsPanel />
      )}
    </DashboardShell>
  );
}
