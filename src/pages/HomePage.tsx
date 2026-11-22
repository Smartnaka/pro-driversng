import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Star,
  UserCheck,
} from 'lucide-react';
import { CarCard } from '../components/CarCard';
import { DriverCard } from '../components/DriverCard';
import { Button, Card, EmptyState, Input, Select } from '../components/ui';
import { apiRequest } from '../lib/api';
import {
  getStatusLabel,
  LAGOS_LOCATIONS,
  type DriverProfile,
  type Vehicle,
} from '../lib/format';

const HERO_IMAGE = '/src/assets/images/hero_lagos_chauffeur_1795309126635.jpg';
const IMG_SUV = '/src/assets/images/vehicle_luxury_suv_1795309127017.jpg';
const IMG_SEDAN = '/src/assets/images/vehicle_exec_sedan_1795309126661.jpg';
const IMG_ECONOMY = '/src/assets/images/vehicle_economy_compact_1795309127763.jpg';
const IMG_VAN = '/src/assets/images/vehicle_executive_van_1795309127419.jpg';

type BookingCategory =
  | 'DRIVER_HIRE'
  | 'CAR_RENTAL'
  | 'CHAUFFEUR_CAR'
  | 'AIRPORT_TRANSFER';

interface PublicReview {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  customerName: string;
  serviceType: string;
  driverName: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
}

const BOOKING_CATEGORIES: Array<{
  id: BookingCategory;
  label: string;
  hint: string;
}> = [
  {
    id: 'DRIVER_HIRE',
    label: 'Driver Hire',
    hint: 'Vetted driver for your own vehicle',
  },
  {
    id: 'CAR_RENTAL',
    label: 'Car Rental',
    hint: 'Daily or weekly self-drive vehicles',
  },
  {
    id: 'CHAUFFEUR_CAR',
    label: 'Chauffeur Car',
    hint: 'Vehicle paired with a professional driver',
  },
  {
    id: 'AIRPORT_TRANSFER',
    label: 'Airport Transfer',
    hint: 'Timed MMIA arrivals and departures',
  },
];

export function HomePage() {
  const navigate = useNavigate();

  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [cars, setCars] = useState<Vehicle[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [partnerTab, setPartnerTab] = useState<'DRIVER' | 'OWNER'>('DRIVER');

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrowIso = useMemo(
    () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    []
  );

  const [searchMode, setSearchMode] = useState<BookingCategory>('DRIVER_HIRE');
  const [pickupLocation, setPickupLocation] = useState(LAGOS_LOCATIONS[0]);
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(tomorrowIso);
  const [durationUnit, setDurationUnit] = useState('DAILY');
  const [durationCount, setDurationCount] = useState(1);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadMarketplace = useCallback(() => {
    setLoadingCatalog(true);
    setCatalogError(null);
    Promise.all([
      apiRequest<{ drivers: DriverProfile[] }>('/api/drivers'),
      apiRequest<{ cars: Vehicle[] }>('/api/cars'),
    ])
      .then(([dRes, cRes]) => {
        setDrivers(dRes.drivers.slice(0, 4));
        setCars(cRes.cars.slice(0, 3));
      })
      .catch((err) => {
        setCatalogError(
          err instanceof Error
            ? err.message
            : 'Unable to load available drivers and vehicles.'
        );
      })
      .finally(() => {
        setLoadingCatalog(false);
      });
  }, []);

  useEffect(() => {
    loadMarketplace();
  }, [loadMarketplace]);

  useEffect(() => {
    let active = true;
    apiRequest<{ reviews: PublicReview[] }>('/api/reviews/public')
      .then((res) => {
        if (active) setReviews(res.reviews || []);
      })
      .catch(() => {
        if (active) setReviews([]);
      })
      .finally(() => {
        if (active) setLoadingReviews(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleCategoryChange(nextCategory: BookingCategory) {
    setSearchMode(nextCategory);
    setSearchError(null);
    if (nextCategory !== 'DRIVER_HIRE' && durationUnit === 'HOURLY') {
      setDurationUnit('DAILY');
    }
    if (nextCategory === 'AIRPORT_TRANSFER' && !destination.trim()) {
      setDestination('Murtala Muhammed Airport (MMIA)');
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedPickup = pickupLocation.trim();
    const trimmedDestination = destination.trim();

    if (!trimmedPickup) {
      setSearchError('Please enter a pickup location.');
      return;
    }
    if (!startDate) {
      setSearchError('Please select a pickup date.');
      return;
    }
    if (startDate < todayIso) {
      setSearchError('Pickup date cannot be in the past.');
      return;
    }
    if (!Number.isFinite(durationCount) || durationCount < 1) {
      setSearchError('Duration must be at least 1.');
      return;
    }

    setSearchError(null);
    const params = new URLSearchParams({
      serviceType: searchMode,
      pickup: trimmedPickup,
      date: startDate,
      unit: durationUnit,
      count: String(Math.floor(durationCount)),
    });
    if (trimmedDestination) {
      params.set('destination', trimmedDestination);
    }
    navigate(`/book?${params.toString()}`);
  }

  return (
    <div className="bg-white">
      {/* Section 2: Hero Section with Integrated Functional Booking Search */}
      <section className="relative overflow-hidden bg-[#111315] text-white">
        <img
          src={HERO_IMAGE}
          alt="Professional Nigerian driver preparing a vehicle for a trip in Lagos"
          loading="eager"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111315]/95 via-[#111315]/80 to-[#111315]/40" />

        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 sm:pb-28 sm:pt-20 lg:px-8 lg:pb-32 lg:pt-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#32BB78]">
              Your journey. Our professionals.
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[54px] lg:leading-[1.08] [text-wrap:balance]">
              The right driver. The right vehicle. Wherever you&apos;re going.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
              Book professional drivers and quality vehicles for everyday travel, business trips, and special occasions.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link to="/drivers">
                <Button variant="primary" size="lg" className="border border-white/25">
                  <UserCheck className="h-4 w-4" />
                  <span>Hire a Driver</span>
                </Button>
              </Link>
              <Link to="/cars">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/35 bg-[#111315]/60 text-white hover:bg-white hover:text-[#111315]"
                >
                  <Car className="h-4 w-4" />
                  <span>Rent a Car</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Functional Booking Search Panel */}
      <section
        aria-label="Booking search"
        className="relative z-10 mx-auto -mt-14 max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <Card className="border-slate-200 bg-white p-5 shadow-lg sm:p-7">
          <form onSubmit={handleSearchSubmit} noValidate className="space-y-5">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
              <div
                role="tablist"
                aria-label="Booking category"
                className="flex flex-wrap items-center gap-1.5"
              >
                {BOOKING_CATEGORIES.map((tab) => {
                  const selected = searchMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => handleCategoryChange(tab.id)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selected
                          ? 'bg-[#111315] text-white'
                          : 'bg-[#F5F6F8] text-slate-700 hover:bg-slate-200 hover:text-[#111315]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">
                {BOOKING_CATEGORIES.find((c) => c.id === searchMode)?.hint}
              </p>
            </div>

            <datalist id="home-lagos-hubs">
              {LAGOS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <label
                  htmlFor="home-pickup"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <MapPin className="h-3.5 w-3.5 text-[#047857]" />
                  <span>Pickup Location</span>
                </label>
                <Input
                  id="home-pickup"
                  type="text"
                  list="home-lagos-hubs"
                  value={pickupLocation}
                  onChange={(e) => {
                    setPickupLocation(e.target.value);
                    if (searchError) setSearchError(null);
                  }}
                  placeholder="e.g. Victoria Island, Lagos"
                  required
                />
              </div>

              <div className="lg:col-span-3">
                <label
                  htmlFor="home-destination"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <Navigation className="h-3.5 w-3.5 text-[#047857]" />
                  <span>Destination (Optional)</span>
                </label>
                <Input
                  id="home-destination"
                  type="text"
                  list="home-lagos-hubs"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={
                    searchMode === 'AIRPORT_TRANSFER'
                      ? 'e.g. Murtala Muhammed Airport'
                      : 'e.g. Ikoyi, Ikeja, or Ibadan'
                  }
                />
              </div>

              <div className="lg:col-span-2">
                <label
                  htmlFor="home-date"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <Calendar className="h-3.5 w-3.5 text-[#047857]" />
                  <span>Pickup Date</span>
                </label>
                <Input
                  id="home-date"
                  type="date"
                  min={todayIso}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (searchError) setSearchError(null);
                  }}
                  required
                />
              </div>

              <div className="lg:col-span-2">
                <label
                  htmlFor="home-duration-unit"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <Clock className="h-3.5 w-3.5 text-[#047857]" />
                  <span>Duration</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  <Input
                    id="home-duration-count"
                    aria-label="Duration count"
                    type="number"
                    min={1}
                    max={90}
                    value={durationCount}
                    onChange={(e) => {
                      setDurationCount(Math.max(1, Number(e.target.value) || 1));
                      if (searchError) setSearchError(null);
                    }}
                    className="col-span-2 px-2.5 text-center tabular-nums"
                  />
                  <Select
                    id="home-duration-unit"
                    aria-label="Duration unit"
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    className="col-span-3 px-2.5"
                  >
                    {searchMode === 'DRIVER_HIRE' ? (
                      <option value="HOURLY">Hours</option>
                    ) : null}
                    <option value="DAILY">Days</option>
                    <option value="WEEKLY">Weeks</option>
                    <option value="MONTHLY">Months</option>
                  </Select>
                </div>
              </div>

              <div className="flex items-end sm:col-span-2 lg:col-span-2">
                <Button type="submit" variant="primary" className="h-[42px] w-full">
                  <span>Continue Booking</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {searchError ? (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            ) : null}
          </form>
        </Card>
      </section>

      {/* Section 3: Core Services */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#111315] sm:text-4xl">
            Core services for every trip
          </h2>
          <p className="mt-2.5 text-base leading-relaxed text-slate-600">
            Whether you need a trusted driver for your own car, a reliable rental for the week, or a chauffeur-driven ride across town, choose the setup that fits your schedule.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-12">
          <Link
            to="/drivers"
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-[#F5F6F8] p-7 transition-colors hover:bg-[#ECEEF2] md:col-span-7"
          >
            <div className="max-w-md">
              <h3 className="font-display text-2xl font-bold text-[#111315]">
                Driver Hire
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Book FRSC &amp; LASDRI-verified drivers by the hour, day, week, or month for school runs, office commutes, errands, or executive travel in your personal vehicle.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#111315] group-hover:text-[#047857]">
                Browse drivers <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-6 h-52 overflow-hidden rounded-xl bg-slate-200">
              <img
                src={IMG_SEDAN}
                alt="Sedan prepared for personal driver hire in Lagos"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </div>
          </Link>

          <Link
            to="/cars"
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-[#F5F6F8] p-7 transition-colors hover:bg-[#ECEEF2] md:col-span-5"
          >
            <div>
              <h3 className="font-display text-2xl font-bold text-[#111315]">
                Car Rental
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Reserve everyday compacts, comfortable sedans, family SUVs, and group vans for daily or weekly travel with transparent rental terms.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#111315] group-hover:text-[#047857]">
                Explore vehicles <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-6 h-52 overflow-hidden rounded-xl bg-slate-200">
              <img
                src={IMG_ECONOMY}
                alt="Compact sedan available for daily and weekly car rental"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </div>
          </Link>

          <Link
            to="/book?serviceType=CHAUFFEUR_CAR"
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-[#F5F6F8] p-7 transition-colors hover:bg-[#ECEEF2] md:col-span-5"
          >
            <div>
              <h3 className="font-display text-xl font-bold text-[#111315]">
                Chauffeur Car
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Pair an approved vehicle with a dedicated professional driver for corporate meetings, family occasions, and multi-stop Lagos itineraries.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#111315] group-hover:text-[#047857]">
                Book vehicle + driver <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-5 h-44 overflow-hidden rounded-xl bg-slate-200">
              <img
                src={IMG_SUV}
                alt="SUV available with professional chauffeur service"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </div>
          </Link>

          <Link
            to="/book?serviceType=AIRPORT_TRANSFER"
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-[#F5F6F8] p-7 transition-colors hover:bg-[#ECEEF2] md:col-span-7"
          >
            <div className="max-w-md">
              <h3 className="font-display text-xl font-bold text-[#111315]">
                Airport Transfers &amp; Intercity Travel
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Dependable pickups between Murtala Muhammed Airport, Ikeja, Mainland, Victoria Island, Ikoyi, and intercity corridors such as Ibadan and Abeokuta.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#111315] group-hover:text-[#047857]">
                Schedule airport or intercity trip{' '}
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-5 h-44 overflow-hidden rounded-xl bg-slate-200">
              <img
                src={IMG_VAN}
                alt="Passenger van ready for airport transfers and group travel"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </div>
          </Link>
        </div>
      </section>

      {/* Section 4: Featured Professional Drivers */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#111315]">
                Featured professional drivers
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Compare experience, verification status, driving categories, and Naira rates.
              </p>
            </div>
            <Link to="/drivers" className="shrink-0">
              <Button variant="outline" size="sm">
                <span>Browse all drivers</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {loadingCatalog ? (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-96 animate-pulse rounded-2xl bg-[#F5F6F8]"
                />
              ))}
            </div>
          ) : catalogError ? (
            <div className="mt-8">
              <EmptyState
                title="Unable to load drivers right now"
                description={catalogError}
                action={
                  <Button variant="secondary" size="sm" onClick={loadMarketplace}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry</span>
                  </Button>
                }
              />
            </div>
          ) : drivers.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="No verified drivers are currently listed"
                description="Approved driver profiles appear here once verification is complete. Check the full directory or apply to join as a driver."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link to="/drivers">
                      <Button variant="outline" size="sm">
                        View driver directory
                      </Button>
                    </Link>
                    <Link to="/register?role=DRIVER">
                      <Button variant="primary" size="sm">
                        Apply as a Driver
                      </Button>
                    </Link>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {drivers.map((driver) => (
                <DriverCard key={driver.id} driver={driver} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 5: Featured Rental Vehicles */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#111315]">
                Featured rental vehicles
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Approved sedans, compacts, SUVs, and vans ready for self-drive or chauffeur hire.
              </p>
            </div>
            <Link to="/cars" className="shrink-0">
              <Button variant="outline" size="sm">
                <span>View all vehicles</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {loadingCatalog ? (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-96 animate-pulse rounded-2xl bg-[#F5F6F8]"
                />
              ))}
            </div>
          ) : catalogError ? (
            <div className="mt-8">
              <EmptyState
                title="Unable to load vehicles right now"
                description={catalogError}
                action={
                  <Button variant="secondary" size="sm" onClick={loadMarketplace}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry</span>
                  </Button>
                }
              />
            </div>
          ) : cars.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="No rental vehicles are currently listed"
                description="Vehicle partners can register fleet cars for admin approval, or you can check back in the vehicle catalogue."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link to="/cars">
                      <Button variant="outline" size="sm">
                        Open vehicle catalogue
                      </Button>
                    </Link>
                    <Link to="/register?role=VEHICLE_OWNER">
                      <Button variant="primary" size="sm">
                        List Your Vehicles
                      </Button>
                    </Link>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cars.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 6: How ProDrivers Works */}
      <section className="border-t border-slate-200/80 bg-[#F5F6F8]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#111315]">
              How ProDrivers works
            </h2>
            <p className="mt-2 text-base text-slate-600">
              A clear booking process from search to dispatch confirmation.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Select your driver or vehicle',
                desc: 'Choose Driver Hire, Car Rental, Chauffeur Car, or Airport Transfer. Filter by Lagos corridor, experience, vehicle type, and pricing.',
              },
              {
                step: '02',
                title: 'Check availability & Naira quote',
                desc: 'Enter your pickup location, destination, date, and duration. The platform checks active schedules for overlaps and computes your exact total in Naira (₦).',
              },
              {
                step: '03',
                title: 'Confirm via Paystack & track trip',
                desc: 'Complete checkout with Paystack verification and follow driver or vehicle-owner acceptance directly from your dashboard.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-slate-200/90 bg-white p-7"
              >
                <span className="font-mono text-sm font-bold text-[#047857] tabular-nums">
                  {item.step}
                </span>
                <h3 className="mt-3 font-display text-xl font-bold text-[#111315]">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: Trust and Safety */}
      <section className="border-t border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-2 text-[#047857]">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-bold tracking-wide uppercase">
                  Trust &amp; Safety
                </span>
              </div>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#111315]">
                Verification and booking controls built into the platform.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Every public listing, schedule reservation, and Naira payment follows structured administrative and server-side checks.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-7">
              {[
                {
                  icon: UserCheck,
                  title: 'Admin document verification',
                  desc: "Driver profiles require FRSC Driver's Licence, LASDRI Certification, NIN, and background clearance review before receiving Verified status.",
                },
                {
                  icon: Car,
                  title: 'Approved vehicle listings',
                  desc: 'Owner-submitted vehicles undergo administrative review of specifications, plate registration, and rental terms before public listing.',
                },
                {
                  icon: Lock,
                  title: 'Conflict-free schedule locking',
                  desc: 'Server-side reservation checks validate driver and vehicle availability against active bookings and blocked dates before confirmation.',
                },
                {
                  icon: CheckCircle2,
                  title: 'Server-calculated Naira checkout',
                  desc: 'Subtotals and platform fees are calculated on the server and paired with Paystack verification for an auditable payment record.',
                },
              ].map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="rounded-2xl border border-slate-200/80 bg-[#F5F6F8] p-6"
                  >
                    <Icon className="h-5 w-5 text-[#047857]" />
                    <h3 className="mt-3 font-display text-base font-bold text-[#111315]">
                      {pillar.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {pillar.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section 8: Become a Driver or Vehicle Partner */}
      <section className="bg-[#111315] text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 p-1">
                <button
                  type="button"
                  onClick={() => setPartnerTab('DRIVER')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    partnerTab === 'DRIVER'
                      ? 'bg-[#32BB78] text-[#111315]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Become a Driver
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerTab('OWNER')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    partnerTab === 'OWNER'
                      ? 'bg-[#32BB78] text-[#111315]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  List Your Vehicles
                </button>
              </div>

              <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {partnerTab === 'DRIVER'
                  ? 'Partner with ProDrivers as a professional driver.'
                  : 'List your vehicles for approved daily and weekly rentals.'}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-300">
                {partnerTab === 'DRIVER'
                  ? 'Set your hourly, daily, weekly, and monthly Naira rates, block unavailable dates, and respond directly to customer booking requests.'
                  : 'Submit vehicle details, set self-drive or chauffeur availability, review booking requests, and track reservations from one owner dashboard.'}
              </p>

              <div className="mt-8 space-y-5">
                {(partnerTab === 'DRIVER'
                  ? [
                      {
                        n: '01.',
                        title: 'Submit verification credentials',
                        desc: 'Upload your FRSC licence, LASDRI details, and identity documents for admin review.',
                      },
                      {
                        n: '02.',
                        title: 'Manage rates and calendar availability',
                        desc: 'Update your Naira pricing and block off dates whenever you are unavailable.',
                      },
                      {
                        n: '03.',
                        title: 'Accept bookings and track completed trips',
                        desc: 'Review incoming trip details and keep a clean record of completed jobs.',
                      },
                    ]
                  : [
                      {
                        n: '01.',
                        title: 'Add your vehicle specifications',
                        desc: 'Provide make, model, plate number, Lagos pickup hub, and rental options.',
                      },
                      {
                        n: '02.',
                        title: 'Prevent double bookings automatically',
                        desc: 'Schedule checks ensure overlapping dates cannot be reserved simultaneously.',
                      },
                      {
                        n: '03.',
                        title: 'Review bookings from your owner portal',
                        desc: 'Approve or decline requests and update maintenance status anytime.',
                      },
                    ]
                ).map((step) => (
                  <div key={step.n} className="flex items-start gap-4">
                    <span className="pt-0.5 font-mono text-sm font-bold text-[#32BB78] tabular-nums">
                      {step.n}
                    </span>
                    <div>
                      <h3 className="font-display text-base font-bold text-white">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={
                    partnerTab === 'DRIVER'
                      ? '/register?role=DRIVER'
                      : '/register?role=VEHICLE_OWNER'
                  }
                >
                  <Button variant="primary" size="lg">
                    <span>
                      {partnerTab === 'DRIVER'
                        ? 'Apply as a Driver'
                        : 'List Your Vehicles'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1B1E23]">
                <img
                  src={partnerTab === 'DRIVER' ? HERO_IMAGE : IMG_SUV}
                  alt={
                    partnerTab === 'DRIVER'
                      ? 'Professional driver working with ProDrivers'
                      : 'Partner vehicle ready for rental listings'
                  }
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-80 w-full object-cover sm:h-[420px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 9: Customer Testimonials (Genuine Verified Reviews Only) */}
      <section className="border-t border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#111315]">
              Customer reviews
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Verified feedback submitted by customers after completed trips on ProDrivers.
            </p>
          </div>

          {loadingReviews ? (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-2xl bg-[#F5F6F8]"
                />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="Verified customer reviews will appear here"
                description="ProDrivers only displays genuine reviews submitted by customers after completing and rating a booked trip. Complete a booking to leave the first verified review."
                action={
                  <Link to="/book">
                    <Button variant="secondary" size="sm">
                      <span>Book a trip</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {reviews.map((review) => {
                const subject = [
                  getStatusLabel(review.serviceType),
                  review.driverName,
                  review.vehicleMake && review.vehicleModel
                    ? `${review.vehicleMake} ${review.vehicleModel}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <article
                    key={review.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-[#F5F6F8] p-6"
                  >
                    <div>
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`h-4 w-4 ${
                              idx < review.rating
                                ? 'fill-amber-500 text-amber-500'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                        <span className="ml-1.5 font-mono text-xs font-semibold text-[#111315] tabular-nums">
                          {review.rating}.0
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-relaxed text-slate-700">
                        “{review.comment}”
                      </p>
                    </div>

                    <div className="mt-6 border-t border-slate-200/80 pt-4">
                      <p className="font-display text-sm font-bold text-[#111315]">
                        {review.customerName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{subject}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
