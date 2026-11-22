import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { RouteMapPreview } from '../components/RouteMapPreview';
import {
  Button,
  Card,
  Input,
  SafeImage,
  Select,
  Textarea,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  formatNaira,
  LAGOS_LOCATIONS,
  type DriverProfile,
  type Vehicle,
} from '../lib/format';

interface PricingQuote {
  driverFeeNgn: number;
  vehicleFeeNgn: number;
  serviceSurchargeNgn: number;
  subtotalNgn: number;
  commissionRatePct: number;
  platformFeeNgn: number;
  totalAmountNgn: number;
  breakdown: { label: string; amountNgn: number }[];
}

export function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();

  const initialDriverId = searchParams.get('driverId') || '';
  const initialVehicleId = searchParams.get('vehicleId') || '';
  const initialService = searchParams.get('serviceType') || (initialVehicleId ? 'CHAUFFEUR_CAR' : 'DRIVER_HIRE');
  const initialOption = searchParams.get('rentalOption') || (initialService === 'CAR_RENTAL' ? 'SELF_DRIVE' : initialService === 'DRIVER_HIRE' ? 'DRIVER_ONLY' : 'CHAUFFEUR');
  const initialPickup = searchParams.get('pickup') || LAGOS_LOCATIONS[0];
  const initialDate =
    searchParams.get('date') ||
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const initialUnit = searchParams.get('unit') || 'DAILY';

  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [cars, setCars] = useState<Vehicle[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [serviceType, setServiceType] = useState(initialService);
  const [rentalOption, setRentalOption] = useState(initialOption);
  const [driverId, setDriverId] = useState(initialDriverId);
  const [vehicleId, setVehicleId] = useState(initialVehicleId);
  const [durationUnit, setDurationUnit] = useState(initialUnit);
  const [durationCount, setDurationCount] = useState(1);
  const [startDate, setStartDate] = useState(initialDate);
  const [startTime, setStartTime] = useState('09:00');
  const [pickupLocation, setPickupLocation] = useState(initialPickup);
  const [destination, setDestination] = useState('Ikoyi, Lagos');
  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '+234 ');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [notes, setNotes] = useState('');

  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [createdBooking, setCreatedBooking] = useState<{
    id: number;
    bookingCode: string;
    totalAmountNgn: number;
  } | null>(null);

  const [paymentState, setPaymentState] = useState<{
    mode?: string;
    reference?: string;
    authorizationUrl?: string;
    message?: string;
    paid?: boolean;
  } | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.fullName);
      setCustomerEmail((prev) => prev || user.email);
      setCustomerPhone((prev) => (prev === '+234 ' && user.phone ? user.phone : prev));
      if (!searchParams.get('pickup') && user.defaultPickupLocation) {
        setPickupLocation((prev) =>
          prev === LAGOS_LOCATIONS[0] ? user.defaultPickupLocation! : prev
        );
      }
    }
  }, [user, searchParams]);

  useEffect(() => {
    Promise.all([
      apiRequest<{ drivers: DriverProfile[] }>('/api/drivers'),
      apiRequest<{ cars: Vehicle[] }>('/api/cars'),
    ])
      .then(([dRes, cRes]) => {
        setDrivers(dRes.drivers);
        setCars(cRes.cars);
        if (!initialDriverId && !initialVehicleId && dRes.drivers.length > 0) {
          setDriverId(String(dRes.drivers[0].id));
        }
      })
      .finally(() => setLoadingCatalog(false));
  }, []);

  // Ensure durationUnit stays valid if vehicle is included
  useEffect(() => {
    if (vehicleId && durationUnit === 'HOURLY') {
      setDurationUnit('DAILY');
    }
  }, [vehicleId, durationUnit]);

  // Adjust rental option automatically based on serviceType
  useEffect(() => {
    if (serviceType === 'DRIVER_HIRE') {
      setRentalOption('DRIVER_ONLY');
      setVehicleId('');
    } else if (serviceType === 'CAR_RENTAL') {
      setRentalOption('SELF_DRIVE');
      setDriverId('');
      if (!vehicleId && cars.length > 0) {
        const selfDriveCar = cars.find((c) => c.allowsSelfDrive);
        if (selfDriveCar) setVehicleId(String(selfDriveCar.id));
      }
    } else if (
      ['CHAUFFEUR_CAR', 'AIRPORT_TRANSFER', 'CORPORATE', 'INTERCITY', 'EVENT'].includes(
        serviceType
      )
    ) {
      setRentalOption(vehicleId ? 'CHAUFFEUR' : 'DRIVER_ONLY');
    }
  }, [serviceType, cars]);

  // Fetch server-side pricing quote whenever selections change
  useEffect(() => {
    if (!driverId && !vehicleId) {
      setQuote(null);
      return;
    }

    const timer = setTimeout(() => {
      setQuoteError(null);
      apiRequest<{ quote: PricingQuote }>('/api/pricing/quote', {
        method: 'POST',
        body: JSON.stringify({
          driverId: driverId ? Number(driverId) : null,
          vehicleId: vehicleId ? Number(vehicleId) : null,
          serviceType,
          rentalOption,
          durationUnit,
          durationCount,
        }),
      })
        .then((res) => setQuote(res.quote))
        .catch((err) => {
          setQuote(null);
          setQuoteError(err instanceof Error ? err.message : 'Quote error.');
        });
    }, 150);

    return () => clearTimeout(timer);
  }, [driverId, vehicleId, serviceType, rentalOption, durationUnit, durationCount]);

  async function handleConfirmBooking(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!user) {
      setSubmitError('Please sign in first to confirm and track your booking.');
      return;
    }

    if (!driverId && !vehicleId) {
      setSubmitError('Select a professional driver or a vehicle to proceed.');
      return;
    }

    setSubmitting(true);
    try {
      const startDateIso = new Date(`${startDate}T${startTime}:00`).toISOString();
      const res = await apiRequest<{
        booking: { id: number; bookingCode: string; totalAmountNgn: number };
      }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          driverId: driverId ? Number(driverId) : null,
          vehicleId: vehicleId ? Number(vehicleId) : null,
          serviceType,
          rentalOption,
          durationUnit,
          durationCount,
          startDateIso,
          pickupLocation,
          destination,
          customerName,
          customerPhone,
          customerEmail,
          notes,
        }),
      });

      setCreatedBooking(res.booking);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to create booking.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInitializePaystack() {
    if (!createdBooking) return;
    setPaying(true);
    setSubmitError(null);
    try {
      const res = await apiRequest<{
        mode: string;
        reference: string;
        authorizationUrl?: string;
        message?: string;
      }>('/api/payments/initialize', {
        method: 'POST',
        body: JSON.stringify({ bookingId: createdBooking.id }),
      });
      setPaymentState(res);
      if (res.authorizationUrl) {
        window.location.assign(res.authorizationUrl);
      }
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to start Paystack payment.'
      );
    } finally {
      setPaying(false);
    }
  }

  async function handleConfirmSandboxPayment() {
    if (!paymentState?.reference) return;
    setPaying(true);
    setSubmitError(null);
    try {
      await apiRequest('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          reference: paymentState.reference,
          sandboxConfirm: true,
        }),
      });
      setPaymentState((prev) => (prev ? { ...prev, paid: true } : prev));
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Payment verification failed.'
      );
    } finally {
      setPaying(false);
    }
  }

  const selectedDriver = drivers.find((d) => String(d.id) === driverId);
  const selectedCar = cars.find((c) => String(c.id) === vehicleId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
          Book a Driver or Vehicle
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Server-verified availability checks and transparent Naira pricing before checkout.
        </p>
      </div>

      {createdBooking ? (
        <div className="mx-auto mt-10 max-w-2xl">
          <Card className="p-6 sm:p-8">
            {paymentState?.paid ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" />
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Booking Confirmed ({createdBooking.bookingCode})
                </h2>
                <p className="text-sm text-slate-600">
                  Your Naira payment has been verified and recorded. Your trip is now confirmed in your dashboard.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/dashboard/bookings/${createdBooking.id}`)}
                  >
                    View Booking Details
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                  >
                    Customer Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs font-medium text-emerald-700">
                      Reservation Locked · Awaiting Payment
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
                      Booking {createdBooking.bookingCode}
                    </h2>
                  </div>
                  <p className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                    {formatNaira(createdBooking.totalAmountNgn)}
                  </p>
                </div>

                {submitError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {submitError}
                  </div>
                ) : null}

                {!paymentState ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Proceed to Paystack checkout to confirm your booking and lock dispatch.
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      disabled={paying}
                      onClick={handleInitializePaystack}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>
                        {paying
                          ? 'Initializing Checkout...'
                          : `Pay ${formatNaira(createdBooking.totalAmountNgn)} with Paystack`}
                      </span>
                    </Button>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => navigate(`/dashboard/bookings/${createdBooking.id}`)}
                      >
                        View Booking Details
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => navigate('/dashboard')}
                      >
                        Pay Later from Dashboard
                      </Button>
                    </div>
                  </div>
                ) : paymentState.mode === 'SANDBOX_UNCONFIGURED' ? (
                  <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/70 p-5">
                    <p className="text-sm font-semibold text-slate-900">
                      Paystack Test Sandbox Mode
                    </p>
                    <p className="text-xs leading-relaxed text-slate-700">
                      {paymentState.message} Reference:{' '}
                      <span className="font-mono font-semibold">
                        {paymentState.reference}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Button
                        variant="primary"
                        disabled={paying}
                        onClick={handleConfirmSandboxPayment}
                      >
                        {paying
                          ? 'Verifying...'
                          : 'Complete Test Payment (Verify Server-Side)'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/dashboard')}
                      >
                        Go to Dashboard
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <form
          onSubmit={handleConfirmBooking}
          className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12"
        >
          {/* Left Form Columns */}
          <div className="space-y-8 lg:col-span-8">
            {/* Step 1: Service */}
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                1. Service Type
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { id: 'DRIVER_HIRE', label: 'Hire a Driver' },
                  { id: 'CAR_RENTAL', label: 'Self-Drive Car' },
                  { id: 'CHAUFFEUR_CAR', label: 'Car + Chauffeur' },
                  { id: 'AIRPORT_TRANSFER', label: 'Airport Transfer' },
                  { id: 'CORPORATE', label: 'Corporate Trip' },
                  { id: 'INTERCITY', label: 'Intercity Trip' },
                  { id: 'EVENT', label: 'Special Event' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServiceType(s.id)}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-medium text-left transition-colors cursor-pointer ${
                      serviceType === s.id
                        ? 'border-emerald-700 bg-emerald-50/70 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* Step 2 & 3: Schedule & Locations */}
            <Card className="p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                2. Schedule & Lagos Route
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Pickup Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Pickup Time
                  </label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Duration Unit
                  </label>
                  <Select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                  >
                    {!vehicleId ? <option value="HOURLY">Hourly</option> : null}
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Count
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={durationCount}
                    onChange={(e) =>
                      setDurationCount(Math.max(1, Number(e.target.value) || 1))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Pickup Location
                  </label>
                  <Input
                    list="lagos-locations"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="e.g. Victoria Island, Lagos"
                    required
                  />
                  <datalist id="lagos-locations">
                    {LAGOS_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Destination (Optional)
                  </label>
                  <Input
                    list="lagos-locations"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Ikoyi, Lagos"
                  />
                </div>
              </div>

              <RouteMapPreview
                pickupLocation={pickupLocation}
                destination={destination}
              />
            </Card>

            {/* Step 4: Driver & Vehicle Selection */}
            <Card className="p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                3. Choose Professional Driver & Vehicle
              </h2>

              {loadingCatalog ? (
                <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {serviceType !== 'CAR_RENTAL' ? (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-700">
                        Professional Driver
                      </label>
                      <Select
                        value={driverId}
                        onChange={(e) => setDriverId(e.target.value)}
                      >
                        <option value="">
                          {vehicleId
                            ? 'Assign Fleet Chauffeur Automatically'
                            : 'Select a verified driver...'}
                        </option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fullName} — {d.location} ({formatNaira(d.dailyRateNgn)}/day)
                          </option>
                        ))}
                      </Select>

                      {selectedDriver ? (
                        <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                          <SafeImage
                            src={selectedDriver.photoUrl}
                            alt={selectedDriver.fullName}
                            fallbackType="driver"
                            className="h-12 w-12 rounded-lg object-cover object-top"
                          />
                          <div className="text-xs">
                            <p className="font-semibold text-slate-900">
                              {selectedDriver.fullName}
                            </p>
                            <p className="text-slate-500">
                              {selectedDriver.yearsExperience} yrs ·{' '}
                              {selectedDriver.location}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {serviceType !== 'DRIVER_HIRE' ? (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-700">
                        Rental Vehicle
                      </label>
                      <Select
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                      >
                        <option value="">No vehicle (Driver only)</option>
                        {cars
                          .filter((c) =>
                            serviceType === 'CAR_RENTAL'
                              ? c.allowsSelfDrive
                              : true
                          )
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.year} {c.make} {c.model} —{' '}
                              {formatNaira(c.dailyRateNgn)}/day
                            </option>
                          ))}
                      </Select>

                      {selectedCar ? (
                        <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                          <SafeImage
                            src={selectedCar.primaryImageUrl}
                            alt={selectedCar.model}
                            fallbackType="car"
                            className="h-12 w-16 rounded-lg object-cover"
                          />
                          <div className="text-xs">
                            <p className="font-semibold text-slate-900">
                              {selectedCar.year} {selectedCar.make}{' '}
                              {selectedCar.model}
                            </p>
                            <p className="text-slate-500">
                              {selectedCar.seats} seats · {selectedCar.location}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </Card>

            {/* Step 5: Customer Details */}
            <Card className="p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  4. Passenger & Contact Details
                </h2>
                {!user ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => loginWithGoogle()}
                    >
                      Quick Google Sign-In
                    </Button>
                    <Link to="/login?redirect=/book">
                      <Button type="button" size="sm" variant="secondary">
                        Sign In
                      </Button>
                    </Link>
                  </div>
                ) : null}
              </div>

              {!user ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span>
                    Sign in with Google or your ProDrivers account before submitting so your reservation is securely attached to your customer dashboard.
                  </span>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Full Name
                  </label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Adaeze Eze"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Phone Number
                  </label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+234 803 000 0000"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@company.ng"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Trip Notes / Flight Number / Protocol Instructions
                </label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional flight code, gate access instructions, or itinerary stops..."
                />
              </div>
            </Card>
          </div>

          {/* Right Server-Calculated Quote Summary */}
          <div className="lg:col-span-4">
            <Card className="sticky top-24 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Pricing Summary
                </h2>
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Calculated server-side in Nigerian Naira (₦).
              </p>

              {quoteError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {quoteError}
                </div>
              ) : null}

              {quote ? (
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
                  {quote.breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="text-xs text-slate-600">{item.label}</span>
                      <span className="font-mono text-xs font-medium text-slate-900 tabular-nums shrink-0">
                        {formatNaira(item.amountNgn)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="font-display text-base font-bold text-slate-900">
                      Total Due
                    </span>
                    <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                      {formatNaira(quote.totalAmountNgn)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-xs text-slate-500">
                  Select a driver or vehicle to view your live Naira breakdown.
                </p>
              )}

              {submitError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {submitError}
                </div>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="mt-6 w-full"
                disabled={submitting || !quote}
              >
                {submitting ? 'Confirming Availability...' : 'Confirm Booking & Pay'}
              </Button>
            </Card>
          </div>
        </form>
      )}
    </div>
  );
}
