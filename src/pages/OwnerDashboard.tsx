import React, { useEffect, useState } from 'react';
import { Check, LogOut, Plus, X } from 'lucide-react';
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
  LAGOS_LOCATIONS,
  type BookingRecord,
  type Vehicle,
} from '../lib/format';

const FLEET_PHOTOS = [
  {
    label: 'Luxury SUV (Range Rover)',
    url: '/src/assets/images/vehicle_luxury_suv_1795309127017.jpg',
  },
  {
    label: 'Executive Sedan (Mercedes E-Class)',
    url: '/src/assets/images/vehicle_exec_sedan_1795309126661.jpg',
  },
  {
    label: 'Economy Sedan (Toyota Corolla)',
    url: '/src/assets/images/vehicle_economy_compact_1795309127763.jpg',
  },
  {
    label: 'Executive Van / Shuttle',
    url: '/src/assets/images/vehicle_executive_van_1795309127419.jpg',
  },
];

export function OwnerDashboard() {
  const { user, logout } = useAuth();
  const [owner, setOwner] = useState<{ companyName: string; location: string } | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [earningsNgn, setEarningsNgn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2023);
  const [category, setCategory] = useState('SUV');
  const [transmission, setTransmission] = useState('AUTOMATIC');
  const [seats, setSeats] = useState(5);
  const [location, setLocation] = useState(LAGOS_LOCATIONS[0]);
  const [plateNumber, setPlateNumber] = useState('');
  const [dailyRateNgn, setDailyRateNgn] = useState(120000);
  const [description, setDescription] = useState('');
  const [primaryImageUrl, setPrimaryImageUrl] = useState(FLEET_PHOTOS[0].url);
  const [allowsSelfDrive, setAllowsSelfDrive] = useState(true);

  const loadOwner = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        owner: { companyName: string; location: string };
        vehicles: Vehicle[];
        bookings: BookingRecord[];
        earningsNgn: number;
      }>('/api/owner/me');
      setOwner(res.owner);
      setVehicles(res.vehicles);
      setBookings(res.bookings);
      setEarningsNgn(res.earningsNgn);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to load fleet dashboard.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwner();
  }, []);

  async function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/api/owner/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          make,
          model,
          year,
          category,
          transmission,
          seats,
          location,
          plateNumber,
          dailyRateNgn,
          description,
          primaryImageUrl,
          allowsSelfDrive,
          allowsChauffeur: true,
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

  async function handleToggleAvailability(vehicle: Vehicle) {
    const next =
      vehicle.availabilityStatus === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
    try {
      await apiRequest(`/api/owner/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ availabilityStatus: next }),
      });
      loadOwner();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  async function handleDecision(bookingId: number, decision: 'ACCEPTED' | 'REJECTED') {
    setError(null);
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
            Vehicle Owner Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {owner?.companyName || user?.fullName} · {owner?.location}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAdd((p) => !p)}
          >
            <Plus className="h-4 w-4" />
            <span>Register Vehicle</span>
          </Button>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Tracked Fleet Earnings</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatNaira(earningsNgn)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Registered Vehicles</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {vehicles.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Rental Bookings</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {bookings.length}
          </p>
        </Card>
      </div>

      {showAdd ? (
        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Add New Vehicle to Fleet
          </h2>
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
                placeholder="Year"
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
              <Input
                type="number"
                placeholder="Daily Rate (₦)"
                value={dailyRateNgn}
                onChange={(e) => setDailyRateNgn(Number(e.target.value))}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                  Vehicle Photo
                </label>
                <Select
                  value={primaryImageUrl}
                  onChange={(e) => setPrimaryImageUrl(e.target.value)}
                >
                  {FLEET_PHOTOS.map((p) => (
                    <option key={p.label} value={p.url}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>
              <label className="flex items-center gap-2 pt-5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allowsSelfDrive}
                  onChange={(e) => setAllowsSelfDrive(e.target.checked)}
                />
                <span>Allow Self-Drive Bookings</span>
              </label>
            </div>

            <Textarea
              rows={2}
              placeholder="Vehicle description, condition notes, and included amenities..."
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

      {/* Registered Fleet */}
      <div className="mt-8 space-y-4">
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Your Registered Vehicles
        </h2>
        {vehicles.length === 0 ? (
          <EmptyState
            title="No vehicles registered yet"
            description="Add your SUVs, sedans, or vans to begin receiving verified Lagos rental bookings."
            action={
              <Button onClick={() => setShowAdd(true)}>Register First Vehicle</Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {vehicles.map((v) => (
              <Card key={v.id} className="flex gap-4 p-4">
                <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <SafeImage
                    src={v.primaryImageUrl}
                    alt={`${v.make} ${v.model}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      {v.year} {v.make} {v.model}
                    </h3>
                    <StatusText status={v.approvalStatus} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {v.plateNumber} · {v.location}
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {formatNaira(v.dailyRateNgn)} / day
                  </p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <StatusText status={v.availabilityStatus} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleAvailability(v)}
                    >
                      {v.availabilityStatus === 'AVAILABLE'
                        ? 'Set Maintenance'
                        : 'Set Available'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rental Requests */}
      <div className="mt-10 space-y-4">
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Incoming Rental Requests
        </h2>
        {bookings.length === 0 ? (
          <EmptyState
            title="No rental requests yet"
            description="Customer reservations for your approved vehicles will appear here."
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
                    {b.customerName} · {b.rentalOption.replace('_', ' ')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {b.pickupLocation} · {formatDateTimeFull(b.startDate)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="mr-3 font-mono text-base font-bold text-slate-900 tabular-nums">
                    {formatNaira(b.subtotalNgn)}
                  </span>
                  {b.ownerDecision === 'PENDING' && b.status !== 'CANCELLED' ? (
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
          ))
        )}
      </div>
    </div>
  );
}
