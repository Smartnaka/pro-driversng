import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Car,
  Check,
  DollarSign,
  Edit3,
  Image as ImageIcon,
  LayoutDashboard,
  Plus,
  Settings,
  Trash2,
  Upload,
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
  type Vehicle,
} from '../lib/format';
import { FLEET_PHOTO_PRESETS, readImageFileAsDataUrl } from '../lib/media';

interface OwnerLedgerItem {
  bookingId: number;
  bookingCode: string;
  vehicleName: string | null;
  serviceType: string;
  status: string;
  reference: string;
  paidAt: string;
  grossSubtotalNgn: number;
  platformFeeNgn: number;
  ownerShareNgn: number;
}

type OwnerTab = 'OVERVIEW' | 'VEHICLES' | 'BOOKINGS' | 'EARNINGS' | 'SETTINGS';

const VEHICLE_FEATURES = [
  'Full AC',
  'Comprehensive Insurance',
  'Leather Interior',
  'Bluetooth Audio',
  'Dashcam Security',
  'USB Charging',
  'GPS Tracker',
];

export function OwnerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<OwnerTab>('OVERVIEW');
  const [bookingFilter, setBookingFilter] = useState<
    'ALL' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  >('ALL');

  const [owner, setOwner] = useState<{
    companyName: string;
    location: string;
    contactPhone?: string;
    verificationStatus?: string;
  } | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [completedEarningsNgn, setCompletedEarningsNgn] = useState(0);
  const [pendingEarningsNgn, setPendingEarningsNgn] = useState(0);
  const [completedRentalsCount, setCompletedRentalsCount] = useState(0);
  const [earningsLedger, setEarningsLedger] = useState<OwnerLedgerItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [photoVehicleId, setPhotoVehicleId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add Vehicle State
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2023);
  const [category, setCategory] = useState('SUV');
  const [transmission, setTransmission] = useState('AUTOMATIC');
  const [fuelType, setFuelType] = useState('Petrol');
  const [seats, setSeats] = useState(5);
  const [location, setLocation] = useState(LAGOS_LOCATIONS[0]);
  const [plateNumber, setPlateNumber] = useState('');
  const [dailyRateNgn, setDailyRateNgn] = useState(120000);
  const [weeklyRateNgn, setWeeklyRateNgn] = useState(720000);
  const [monthlyRateNgn, setMonthlyRateNgn] = useState(2600000);
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>([
    'Full AC',
    'Comprehensive Insurance',
  ]);
  const [primaryImageUrl, setPrimaryImageUrl] = useState(
    FLEET_PHOTO_PRESETS[0].url
  );
  const [allowsSelfDrive, setAllowsSelfDrive] = useState(true);
  const [allowsChauffeur, setAllowsChauffeur] = useState(true);

  // Edit Vehicle State
  const [editForm, setEditForm] = useState<{
    make: string;
    model: string;
    year: number;
    category: string;
    transmission: string;
    fuelType: string;
    seats: number;
    location: string;
    plateNumber: string;
    dailyRateNgn: number;
    weeklyRateNgn: number;
    monthlyRateNgn: number;
    description: string;
    features: string[];
    allowsSelfDrive: boolean;
    allowsChauffeur: boolean;
  } | null>(null);

  // Photo Manager State
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoPrimary, setNewPhotoPrimary] = useState(false);

  // Maintenance Block State
  const [blockVehicleId, setBlockVehicleId] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('Scheduled Maintenance');

  const loadOwner = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        owner: {
          companyName: string;
          location: string;
          contactPhone?: string;
          verificationStatus?: string;
        };
        vehicles: Vehicle[];
        bookings: BookingRecord[];
        completedEarningsNgn: number;
        pendingEarningsNgn: number;
        completedRentalsCount: number;
        earningsLedger: OwnerLedgerItem[];
      }>('/api/owner/me');
      setOwner(res.owner);
      setVehicles(res.vehicles);
      setBookings(res.bookings);
      setCompletedEarningsNgn(res.completedEarningsNgn || 0);
      setPendingEarningsNgn(res.pendingEarningsNgn || 0);
      setCompletedRentalsCount(res.completedRentalsCount || 0);
      setEarningsLedger(res.earningsLedger || []);
      if (res.vehicles.length > 0 && !blockVehicleId) {
        setBlockVehicleId(String(res.vehicles[0].id));
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to load fleet dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }, [blockVehicleId]);

  useEffect(() => {
    loadOwner();
  }, [loadOwner]);

  async function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiRequest('/api/owner/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          make: make.trim(),
          model: model.trim(),
          year,
          category,
          transmission,
          fuelType,
          seats,
          location,
          plateNumber: plateNumber.trim(),
          dailyRateNgn,
          weeklyRateNgn,
          monthlyRateNgn,
          description: description.trim(),
          features,
          primaryImageUrl,
          allowsSelfDrive,
          allowsChauffeur,
        }),
      });
      setMake('');
      setModel('');
      setPlateNumber('');
      setDescription('');
      setShowAdd(false);
      setMessage('Vehicle registered and submitted for admin fleet approval.');
      loadOwner();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register vehicle.');
    }
  }

  function startEditing(v: Vehicle) {
    setPhotoVehicleId(null);
    setConfirmDeleteId(null);
    setEditingVehicleId(v.id);
    setEditForm({
      make: v.make,
      model: v.model,
      year: v.year,
      category: v.category,
      transmission: v.transmission,
      fuelType: v.fuelType,
      seats: v.seats,
      location: v.location,
      plateNumber: v.plateNumber,
      dailyRateNgn: v.dailyRateNgn,
      weeklyRateNgn: v.weeklyRateNgn,
      monthlyRateNgn: v.monthlyRateNgn,
      description: v.description,
      features: v.features || [],
      allowsSelfDrive: v.allowsSelfDrive,
      allowsChauffeur: v.allowsChauffeur,
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingVehicleId || !editForm) return;
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/api/owner/vehicles/${editingVehicleId}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      setEditingVehicleId(null);
      setEditForm(null);
      setMessage('Vehicle details and pricing updated.');
      loadOwner();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update vehicle.');
    }
  }

  async function handleToggleAvailability(vehicle: Vehicle) {
    setError(null);
    setMessage(null);
    const next =
      vehicle.availabilityStatus === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
    try {
      await apiRequest(`/api/owner/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ availabilityStatus: next }),
      });
      setMessage(
        `${vehicle.year} ${vehicle.make} ${vehicle.model} marked ${getStatusLabel(next)}.`
      );
      loadOwner();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  async function handleDeleteVehicle(vehicleId: number) {
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/api/owner/vehicles/${vehicleId}`, {
        method: 'DELETE',
      });
      setConfirmDeleteId(null);
      setMessage('Vehicle listing removed.');
      loadOwner();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to remove vehicle.');
    }
  }

  async function handleAddVehicleImage(e: React.FormEvent, vehicleId: number) {
    e.preventDefault();
    if (!newPhotoUrl.trim()) {
      setError('Upload a photo or select a studio image first.');
      return;
    }
    setError(null);
    try {
      await apiRequest(`/api/owner/vehicles/${vehicleId}/images`, {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: newPhotoUrl.trim(),
          caption: newPhotoCaption.trim() || undefined,
          setAsPrimary: newPhotoPrimary,
        }),
      });
      setNewPhotoUrl('');
      setNewPhotoCaption('');
      setNewPhotoPrimary(false);
      setMessage('Vehicle photo added to gallery.');
      loadOwner();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to add photo.');
    }
  }

  async function handleSetPrimaryPhoto(vehicleId: number, imageUrl: string) {
    setError(null);
    try {
      await apiRequest(`/api/owner/vehicles/${vehicleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ primaryImageUrl: imageUrl }),
      });
      setMessage('Primary listing photo updated.');
      loadOwner();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update primary photo.');
    }
  }

  async function handleDeletePhoto(vehicleId: number, imageId: number) {
    setError(null);
    try {
      await apiRequest(`/api/owner/vehicles/${vehicleId}/images/${imageId}`, {
        method: 'DELETE',
      });
      setMessage('Gallery photo removed.');
      loadOwner();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to remove photo.');
    }
  }

  async function handleBlockDates(e: React.FormEvent) {
    e.preventDefault();
    if (!blockVehicleId) return;
    setError(null);
    try {
      await apiRequest('/api/owner/availability', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: Number(blockVehicleId),
          startDate: blockStart,
          endDate: blockEnd,
          reason: blockReason,
        }),
      });
      setBlockStart('');
      setBlockEnd('');
      setMessage('Vehicle maintenance window saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save blocked dates.');
    }
  }

  async function handleDecision(bookingId: number, decision: 'ACCEPTED' | 'REJECTED') {
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/api/owner/bookings/${bookingId}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setMessage(`Rental request ${decision.toLowerCase()}.`);
      loadOwner();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Decision failed.');
    }
  }

  const approvedVehiclesCount = vehicles.filter(
    (v) => v.approvalStatus === 'APPROVED' && v.availabilityStatus === 'AVAILABLE'
  ).length;
  const pendingBookings = bookings.filter(
    (b) => b.ownerDecision === 'PENDING' && !['CANCELLED', 'REFUNDED'].includes(b.status)
  );
  const activeBookings = bookings.filter((b) =>
    ['CONFIRMED', 'IN_PROGRESS'].includes(b.status)
  );

  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'PENDING') {
      return b.ownerDecision === 'PENDING' && !['CANCELLED', 'REFUNDED'].includes(b.status);
    }
    if (bookingFilter === 'ACTIVE') {
      return ['CONFIRMED', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(b.status);
    }
    if (bookingFilter === 'COMPLETED') return b.status === 'COMPLETED';
    if (bookingFilter === 'CANCELLED') {
      return ['CANCELLED', 'REFUNDED'].includes(b.status);
    }
    return true;
  });

  const navItems: DashboardNavItem[] = [
    { id: 'OVERVIEW', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'VEHICLES',
      label: 'My Vehicles',
      icon: Car,
      badge: vehicles.length > 0 ? vehicles.length : undefined,
    },
    {
      id: 'BOOKINGS',
      label: 'Rental Bookings',
      icon: Calendar,
      badge: pendingBookings.length > 0 ? pendingBookings.length : undefined,
    },
    { id: 'EARNINGS', label: 'Earnings', icon: DollarSign },
    { id: 'SETTINGS', label: 'Account Settings', icon: Settings },
  ];

  const sectionLabels: Record<OwnerTab, string> = {
    OVERVIEW: 'Overview',
    VEHICLES: 'My Vehicles',
    BOOKINGS: 'Rental Bookings',
    EARNINGS: 'Earnings',
    SETTINGS: 'Account Settings',
  };

  return (
    <DashboardShell
      workspaceLabel="Fleet Partner Portal"
      sectionLabel={sectionLabels[tab]}
      title={owner?.companyName || user?.fullName || 'Fleet Portal'}
      subtitle={`${owner?.location || 'Lagos'} · Manage listed vehicles, rental approvals, and fleet payouts.`}
      navItems={navItems}
      activeNav={tab}
      onNavChange={(id) => setTab(id as OwnerTab)}
      primaryAction={
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setTab('VEHICLES');
            setShowAdd(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Vehicle</span>
        </Button>
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
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Total Vehicles</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {vehicles.length}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Active Approved</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {approvedVehiclesCount}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Pending Requests</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {pendingBookings.length}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Completed Earnings</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {formatNaira(completedEarningsNgn)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Pending Earnings</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {formatNaira(pendingEarningsNgn)}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="p-6 lg:col-span-7">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-[#111315]">
                  Recent Rental Requests
                </h2>
                <button
                  type="button"
                  onClick={() => setTab('BOOKINGS')}
                  className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
                >
                  All rentals ({bookings.length})
                </button>
              </div>
              {bookings.length === 0 ? (
                <p className="mt-4 text-xs text-slate-500">
                  Incoming customer bookings for your approved vehicles will appear here.
                </p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {bookings.slice(0, 4).map((b) => (
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
                          {b.vehicleName} · {b.customerName}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {formatDateTimeFull(b.startDate)}
                        </p>
                      </div>
                      <Link to={`/dashboard/bookings/${b.id}`}>
                        <Button size="sm" variant="outline">
                          Details
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
                  Fleet Snapshot
                </h2>
                <button
                  type="button"
                  onClick={() => setTab('VEHICLES')}
                  className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
                >
                  Manage fleet
                </button>
              </div>
              {vehicles.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="No vehicles yet"
                    description="Register your first vehicle for admin verification."
                    action={
                      <Button
                        size="sm"
                        onClick={() => {
                          setTab('VEHICLES');
                          setShowAdd(true);
                        }}
                      >
                        Add First Vehicle
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {vehicles.slice(0, 4).map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[#111315]">
                          {v.year} {v.make} {v.model}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {v.plateNumber} · {formatNaira(v.dailyRateNgn)}/day
                        </p>
                      </div>
                      <StatusText status={v.approvalStatus} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : tab === 'VEHICLES' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-[#111315]">
              Your Registered Fleet ({vehicles.length})
            </h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAdd((p) => !p)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showAdd ? 'Close Form' : 'Register New Vehicle'}</span>
            </Button>
          </div>

          {showAdd ? (
            <Card className="p-6">
              <h3 className="font-display text-base font-semibold text-[#111315]">
                Add Vehicle to Fleet
              </h3>
              <form onSubmit={handleAddVehicle} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <Input
                    placeholder="Make (e.g. Toyota)"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Model (e.g. Camry)"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                  />
                  <Input
                    type="number"
                    min={1995}
                    max={2028}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    required
                  />
                  <Input
                    placeholder="Plate (e.g. LND-204-AA)"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="SUV">SUV</option>
                    <option value="SEDAN">Sedan</option>
                    <option value="LUXURY">Luxury</option>
                    <option value="ECONOMY">Economy</option>
                    <option value="VAN">Van</option>
                    <option value="BUS">Bus</option>
                  </Select>
                  <Select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value)}
                  >
                    <option value="AUTOMATIC">Automatic</option>
                    <option value="MANUAL">Manual</option>
                  </Select>
                  <Input
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    placeholder="Fuel (e.g. Petrol)"
                  />
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

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">Seats</label>
                    <Input
                      type="number"
                      min={2}
                      max={30}
                      value={seats}
                      onChange={(e) => setSeats(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Daily Rate (₦)
                    </label>
                    <Input
                      type="number"
                      min={5000}
                      value={dailyRateNgn}
                      onChange={(e) => setDailyRateNgn(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Weekly Rate (₦)
                    </label>
                    <Input
                      type="number"
                      min={25000}
                      value={weeklyRateNgn}
                      onChange={(e) => setWeeklyRateNgn(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      Monthly Rate (₦)
                    </label>
                    <Input
                      type="number"
                      min={100000}
                      value={monthlyRateNgn}
                      onChange={(e) => setMonthlyRateNgn(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <SafeImage
                    src={primaryImageUrl}
                    alt="Vehicle preview"
                    fallbackType="car"
                    className="h-20 w-32 rounded-xl border border-slate-200 object-cover"
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
                            setPrimaryImageUrl(await readImageFileAsDataUrl(f, 960));
                          } catch (err: unknown) {
                            setError(err instanceof Error ? err.message : 'Photo error.');
                          }
                        }}
                      />
                    </label>
                    <Select
                      value={
                        FLEET_PHOTO_PRESETS.some((p) => p.url === primaryImageUrl)
                          ? primaryImageUrl
                          : ''
                      }
                      onChange={(e) => {
                        if (e.target.value) setPrimaryImageUrl(e.target.value);
                      }}
                    >
                      <option value="">Or select curated vehicle photo...</option>
                      {FLEET_PHOTO_PRESETS.map((p) => (
                        <option key={p.label} value={p.url}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {VEHICLE_FEATURES.map((feat) => {
                    const active = features.includes(feat);
                    return (
                      <button
                        key={feat}
                        type="button"
                        onClick={() =>
                          setFeatures((prev) =>
                            prev.includes(feat)
                              ? prev.filter((f) => f !== feat)
                              : [...prev, feat]
                          )
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                          active
                            ? 'border-[#111315] bg-[#111315] text-white'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {feat}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-6 text-xs text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowsSelfDrive}
                      onChange={(e) => setAllowsSelfDrive(e.target.checked)}
                    />
                    <span>Allow Self-Drive</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowsChauffeur}
                      onChange={(e) => setAllowsChauffeur(e.target.checked)}
                    />
                    <span>Allow Chauffeur-Driven</span>
                  </label>
                </div>

                <Textarea
                  rows={2}
                  placeholder="Condition notes, fuel policy, and included amenities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <div className="flex gap-2">
                  <Button type="submit" variant="primary">
                    Submit Vehicle for Approval
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAdd(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}

          {vehicles.length === 0 ? (
            <EmptyState
              title="No vehicles registered yet"
              description="Add your SUVs, sedans, or vans to begin receiving verified Lagos rental bookings."
              action={
                <Button onClick={() => setShowAdd(true)}>
                  Register First Vehicle
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {vehicles.map((v) => (
                <Card key={v.id} className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-44">
                      <SafeImage
                        src={v.primaryImageUrl}
                        alt={`${v.make} ${v.model}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-base font-semibold text-[#111315]">
                            {v.year} {v.make} {v.model}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {v.plateNumber} · {v.category} · {v.transmission} ·{' '}
                            {v.seats} seats · {v.location}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusText status={v.approvalStatus} />
                          <StatusText status={v.availabilityStatus} />
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-4 font-mono text-xs text-slate-700 tabular-nums">
                        <span>{formatNaira(v.dailyRateNgn)} / day</span>
                        <span>{formatNaira(v.weeklyRateNgn)} / week</span>
                        <span>{formatNaira(v.monthlyRateNgn)} / month</span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(v)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit Specs & Rates</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingVehicleId(null);
                            setConfirmDeleteId(null);
                            setPhotoVehicleId(photoVehicleId === v.id ? null : v.id);
                          }}
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span>Photos ({v.images?.length || 1})</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleAvailability(v)}
                        >
                          {v.availabilityStatus === 'AVAILABLE'
                            ? 'Set Maintenance'
                            : 'Set Available'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setConfirmDeleteId(confirmDeleteId === v.id ? null : v.id)
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          <span className="text-red-700">Remove</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {confirmDeleteId === v.id ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-900">
                        Remove {v.year} {v.make} {v.model} ({v.plateNumber})? Listings with active bookings cannot be deleted.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteVehicle(v.id)}
                        >
                          Confirm Remove
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {editingVehicleId === v.id && editForm ? (
                    <form
                      onSubmit={handleSaveEdit}
                      className="mt-5 space-y-4 border-t border-slate-100 pt-5"
                    >
                      <p className="font-display text-sm font-semibold text-[#111315]">
                        Edit Vehicle Specs & Rates
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <Input
                          value={editForm.make}
                          onChange={(e) =>
                            setEditForm({ ...editForm, make: e.target.value })
                          }
                          placeholder="Make"
                          required
                        />
                        <Input
                          value={editForm.model}
                          onChange={(e) =>
                            setEditForm({ ...editForm, model: e.target.value })
                          }
                          placeholder="Model"
                          required
                        />
                        <Input
                          type="number"
                          value={editForm.year}
                          onChange={(e) =>
                            setEditForm({ ...editForm, year: Number(e.target.value) })
                          }
                          required
                        />
                        <Input
                          value={editForm.plateNumber}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              plateNumber: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <Select
                          value={editForm.category}
                          onChange={(e) =>
                            setEditForm({ ...editForm, category: e.target.value })
                          }
                        >
                          <option value="SUV">SUV</option>
                          <option value="SEDAN">Sedan</option>
                          <option value="LUXURY">Luxury</option>
                          <option value="ECONOMY">Economy</option>
                          <option value="VAN">Van</option>
                          <option value="BUS">Bus</option>
                        </Select>
                        <Select
                          value={editForm.transmission}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              transmission: e.target.value,
                            })
                          }
                        >
                          <option value="AUTOMATIC">Automatic</option>
                          <option value="MANUAL">Manual</option>
                        </Select>
                        <Select
                          value={editForm.location}
                          onChange={(e) =>
                            setEditForm({ ...editForm, location: e.target.value })
                          }
                        >
                          {LAGOS_LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </Select>
                        <Input
                          type="number"
                          value={editForm.seats}
                          onChange={(e) =>
                            setEditForm({ ...editForm, seats: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs text-slate-600">
                            Daily (₦)
                          </label>
                          <Input
                            type="number"
                            value={editForm.dailyRateNgn}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                dailyRateNgn: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-600">
                            Weekly (₦)
                          </label>
                          <Input
                            type="number"
                            value={editForm.weeklyRateNgn}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                weeklyRateNgn: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-600">
                            Monthly (₦)
                          </label>
                          <Input
                            type="number"
                            value={editForm.monthlyRateNgn}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                monthlyRateNgn: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                      <Textarea
                        rows={2}
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm({ ...editForm, description: e.target.value })
                        }
                      />
                      <div className="flex flex-wrap gap-6 text-xs text-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.allowsSelfDrive}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                allowsSelfDrive: e.target.checked,
                              })
                            }
                          />
                          <span>Allow Self-Drive</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.allowsChauffeur}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                allowsChauffeur: e.target.checked,
                              })
                            }
                          />
                          <span>Allow Chauffeur</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" variant="primary">
                          Save Vehicle Updates
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingVehicleId(null);
                            setEditForm(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : null}

                  {photoVehicleId === v.id ? (
                    <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                      <p className="font-display text-sm font-semibold text-[#111315]">
                        Vehicle Photo Gallery
                      </p>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {(v.images || []).map((img) => (
                          <div
                            key={img.id}
                            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                          >
                            <SafeImage
                              src={img.imageUrl}
                              alt={img.caption || v.model}
                              className="h-24 w-full object-cover"
                            />
                            <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px]">
                              {v.primaryImageUrl === img.imageUrl ? (
                                <span className="font-semibold text-emerald-700">
                                  Primary
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetPrimaryPhoto(v.id, img.imageUrl)
                                  }
                                  className="font-medium text-slate-600 hover:text-[#111315] cursor-pointer"
                                >
                                  Set Primary
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(v.id, img.id)}
                                className="text-red-600 hover:underline cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <form
                        onSubmit={(e) => handleAddVehicleImage(e, v.id)}
                        className="flex flex-wrap items-end gap-3 rounded-xl bg-[#F5F6F8] p-4"
                      >
                        <div className="space-y-1.5">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#111315] hover:bg-slate-50">
                            <Upload className="h-3.5 w-3.5" />
                            <span>
                              {newPhotoUrl ? 'Photo Ready' : 'Upload New Photo'}
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="sr-only"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                try {
                                  setNewPhotoUrl(
                                    await readImageFileAsDataUrl(f, 960)
                                  );
                                } catch (err: unknown) {
                                  setError(
                                    err instanceof Error
                                      ? err.message
                                      : 'Photo error.'
                                  );
                                }
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex-1 min-w-[180px]">
                          <Input
                            value={newPhotoCaption}
                            onChange={(e) => setNewPhotoCaption(e.target.value)}
                            placeholder="Caption (e.g. Rear cabin interior)"
                            className="bg-white"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pb-2">
                          <input
                            type="checkbox"
                            checked={newPhotoPrimary}
                            onChange={(e) => setNewPhotoPrimary(e.target.checked)}
                          />
                          <span>Set as primary</span>
                        </label>

                        <Button type="submit" size="sm" variant="primary">
                          Add Photo
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          )}

          {vehicles.length > 0 ? (
            <Card className="p-6">
              <h3 className="font-display text-base font-semibold text-[#111315]">
                Block Vehicle Maintenance Dates
              </h3>
              <form
                onSubmit={handleBlockDates}
                className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5"
              >
                <Select
                  value={blockVehicleId}
                  onChange={(e) => setBlockVehicleId(e.target.value)}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model} ({v.plateNumber})
                    </option>
                  ))}
                </Select>
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
                <Input
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Reason"
                />
                <Button type="submit" variant="secondary">
                  Block Dates
                </Button>
              </form>
            </Card>
          ) : null}
        </div>
      ) : tab === 'BOOKINGS' ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
            {[
              { id: 'ALL', label: `All (${bookings.length})` },
              { id: 'PENDING', label: `Pending (${pendingBookings.length})` },
              { id: 'ACTIVE', label: `Active (${activeBookings.length})` },
              {
                id: 'COMPLETED',
                label: `Completed (${completedRentalsCount})`,
              },
              {
                id: 'CANCELLED',
                label: `Cancelled (${
                  bookings.filter((b) => ['CANCELLED', 'REFUNDED'].includes(b.status))
                    .length
                })`,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() =>
                  setBookingFilter(
                    f.id as
                      | 'ALL'
                      | 'PENDING'
                      | 'ACTIVE'
                      | 'COMPLETED'
                      | 'CANCELLED'
                  )
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                  bookingFilter === f.id
                    ? 'bg-[#111315] text-white'
                    : 'text-slate-600 hover:text-[#111315]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <EmptyState
              title="No rental bookings in this view"
              description="Customer reservations for your approved vehicles appear here."
            />
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => (
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
                        {b.ownerDecision ? (
                          <span className="text-xs text-slate-500">
                            · Response: {getStatusLabel(b.ownerDecision)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {b.vehicleName} · {getStatusLabel(b.rentalOption)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {b.customerName} ({b.customerPhone}) · {b.pickupLocation} ·{' '}
                        {formatDateTimeFull(b.startDate)}
                        {b.driverName ? ` · Chauffeur: ${b.driverName}` : ''}
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
                      {b.ownerDecision === 'PENDING' &&
                      !['CANCELLED', 'REFUNDED', 'COMPLETED'].includes(b.status) ? (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleDecision(b.id, 'ACCEPTED')}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecision(b.id, 'REJECTED')}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Decline</span>
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
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
              <p className="text-xs font-medium text-slate-500">Pending / Active Rentals</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {formatNaira(pendingEarningsNgn)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-slate-500">Completed Rentals</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#111315] tabular-nums">
                {completedRentalsCount}
              </p>
            </Card>
          </div>

          {earningsLedger.length === 0 ? (
            <EmptyState
              title="No verified rental earnings yet"
              description="Paid and confirmed bookings for your fleet appear here once Paystack payments clear."
            />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Paystack Ref</th>
                    <th className="px-4 py-3 text-right">Fleet Share</th>
                    <th className="px-4 py-3">Status</th>
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
                      <td className="px-4 py-3 text-xs text-slate-800">
                        {item.vehicleName || 'Vehicle'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {item.reference}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-[#111315] tabular-nums">
                        {formatNaira(item.ownerShareNgn)}
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
      ) : (
        <AccountSettingsPanel />
      )}
    </DashboardShell>
  );
}
