import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Car,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { CarCard } from '../components/CarCard';
import { DriverCard } from '../components/DriverCard';
import { Button, Card, Input, Select } from '../components/ui';
import { apiRequest } from '../lib/api';
import {
  LAGOS_LOCATIONS,
  type DriverProfile,
  type Vehicle,
} from '../lib/format';

const HERO_IMAGE = '/src/assets/images/hero_lagos_chauffeur_1795309126635.jpg';
const IMG_SUV = '/src/assets/images/vehicle_luxury_suv_1795309127017.jpg';
const IMG_SEDAN = '/src/assets/images/vehicle_exec_sedan_1795309126661.jpg';
const IMG_ECONOMY = '/src/assets/images/vehicle_economy_compact_1795309127763.jpg';
const IMG_VAN = '/src/assets/images/vehicle_executive_van_1795309127419.jpg';

const DEMO_TESTIMONIALS = [
  {
    quote:
      'Coordinating airport pickups for visiting directors in Victoria Island used to require three separate calls. Now we book a vetted chauffeur and E-Class in two minutes with transparent Naira invoicing.',
    name: 'Ngozi Okafor-Bello',
    role: 'Head of Corporate Services, Atlantic Ridge Capital (Lagos)',
  },
  {
    quote:
      'We booked an experienced driver for a four-day client roadshow across Ikoyi, Ikeja, and Lekki. He arrived fifteen minutes early every morning and navigated every corridor calmly.',
    name: 'Damilola Adesina',
    role: 'Operations Director, Meridian Health Partners',
  },
  {
    quote:
      'Reserving a self-drive Toyota Corolla from Ikeja GRA was seamless. Vehicle inspection was thorough, pricing matched the quote, and terms were crystal clear.',
    name: 'Kelechi Nwankwo',
    role: 'Product Manager, FinBridge Lagos',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [cars, setCars] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerTab, setPartnerTab] = useState<'DRIVER' | 'OWNER'>('DRIVER');

  const [searchMode, setSearchMode] = useState<
    'DRIVER_HIRE' | 'CAR_RENTAL' | 'CHAUFFEUR_CAR' | 'AIRPORT_TRANSFER'
  >('DRIVER_HIRE');
  const [pickupLocation, setPickupLocation] = useState(LAGOS_LOCATIONS[0]);
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [durationUnit, setDurationUnit] = useState('DAILY');

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<{ drivers: DriverProfile[] }>('/api/drivers'),
      apiRequest<{ cars: Vehicle[] }>('/api/cars'),
    ])
      .then(([dRes, cRes]) => {
        if (!active) return;
        setDrivers(dRes.drivers.slice(0, 4));
        setCars(cRes.cars.slice(0, 3));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      serviceType: searchMode,
      pickup: pickupLocation,
      date: startDate,
      unit: durationUnit,
    });
    navigate(`/book?${params.toString()}`);
  }

  return (
    <div className="bg-white">
      {/* Bolt-Inspired Full-Bleed Atmospheric Hero */}
      <section className="relative overflow-hidden bg-[#111315] text-white">
        <img
          src={HERO_IMAGE}
          alt="Uniformed Nigerian chauffeur opening an executive sedan in Victoria Island, Lagos"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111315]/95 via-[#111315]/70 to-[#111315]/30" />

        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#32BB78]">
              Lagos, Nigeria · Your journey. Our professionals.
            </p>
            <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl [text-wrap:balance]">
              Professional drivers. Premium rides. One platform.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
              Hire LASDRI-verified chauffeurs or reserve inspected vehicles across Victoria Island, Ikoyi, Lekki, and Ikeja with upfront Naira pricing.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link to="/drivers">
                <Button variant="primary" size="lg">
                  <UserCheck className="h-4 w-4" />
                  <span>Hire a Driver</span>
                </Button>
              </Link>
              <Link to="/cars">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                >
                  <Car className="h-4 w-4" />
                  <span>Rent a Car</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Elevated Floating Dispatch Search Card */}
      <section className="relative z-10 mx-auto -mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="border-slate-200 bg-white p-5 shadow-lg sm:p-6">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-[#F5F6F8] p-1 w-fit">
              {[
                { id: 'DRIVER_HIRE', label: 'Hire a Driver' },
                { id: 'CAR_RENTAL', label: 'Rent a Car' },
                { id: 'CHAUFFEUR_CAR', label: 'Vehicle + Chauffeur' },
                { id: 'AIRPORT_TRANSFER', label: 'Airport Transfer' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setSearchMode(
                      tab.id as
                        | 'DRIVER_HIRE'
                        | 'CAR_RENTAL'
                        | 'CHAUFFEUR_CAR'
                        | 'AIRPORT_TRANSFER'
                    )
                  }
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    searchMode === tab.id
                      ? 'bg-[#111315] text-white'
                      : 'text-slate-600 hover:text-[#111315]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <MapPin className="h-3.5 w-3.5 text-[#047857]" />
                  <span>Pickup Location (Lagos)</span>
                </label>
                <Select
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                >
                  {LAGOS_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Calendar className="h-3.5 w-3.5 text-[#047857]" />
                  <span>Pickup Date</span>
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Duration
                </label>
                <Select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                >
                  {searchMode === 'DRIVER_HIRE' ? (
                    <option value="HOURLY">Hourly</option>
                  ) : null}
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </Select>
              </div>

              <div className="flex items-end">
                <Button type="submit" variant="primary" className="w-full h-[42px]">
                  <span>Search & Book</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </section>

      {/* Bolt-Style "Our Services" Bento Grid */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#111315] sm:text-4xl">
            Our services
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Flexible driver hire and vehicle rentals built for Lagos executives, families, and corporate teams.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-12">
          <Link
            to="/drivers"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#F5F6F8] p-7 transition-colors hover:bg-[#ECEEF2] md:col-span-7"
          >
            <div className="max-w-md">
              <h3 className="font-display text-2xl font-bold text-[#111315]">
                Hire a Chauffeur
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Book FRSC & LASDRI-verified drivers by the hour, day, week, or month for your personal or company vehicle.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#111315] group-hover:text-[#047857]">
                Browse drivers <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-6 h-52 overflow-hidden rounded-xl bg-slate-200">
              <img
                src={IMG_SEDAN}
                alt="Executive chauffeur sedan"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
          </Link>

          <Link
            to="/cars"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#F5F6F8] p-7 transition-colors hover:bg-[#ECEEF2] md:col-span-5"
          >
            <div>
              <h3 className="font-display text-2xl font-bold text-[#111315]">
                Rent a Car
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Choose from SUVs, executive sedans, economy cars, and group vans—self-drive or chauffeur-driven.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#111315] group-hover:text-[#047857]">
                Explore fleet <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-6 h-52 overflow-hidden rounded-xl bg-slate-200">
              <img
                src={IMG_SUV}
                alt="Range Rover Autobiography luxury SUV"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
          </Link>

          <Link
            to="/book?serviceType=AIRPORT_TRANSFER"
            className="group flex flex-col justify-between overflow-hidden rounded-2xl bg-[#F5F6F8] p-7 transition-colors hover:bg-[#ECEEF2] md:col-span-5"
          >
            <div>
              <h3 className="font-display text-xl font-bold text-[#111315]">
                MMIA Airport Protocol
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Punctual arrivals and departures between Murtala Muhammed Airport, Ikeja, Ikoyi, and Victoria Island.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#111315] group-hover:text-[#047857]">
                Book airport transfer <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-5 h-44 overflow-hidden rounded-xl bg-slate-200">
              <img
                src={IMG_VAN}
                alt="Executive airport shuttle van"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
          </Link>

          <Link
            to="/book?serviceType=CORPORATE"
            className="group flex flex-col justify-between overflow-hidden rounded-2xl bg-[#F5F6F8] p-7 transition-colors hover:bg-[#ECEEF2] md:col-span-7"
          >
            <div className="max-w-md">
              <h3 className="font-display text-xl font-bold text-[#111315]">
                Corporate & Intercity Travel
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Dedicated retainers, executive roadshows, and Lagos-to-Ibadan or Abeokuta highway charters with verified receipts.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#111315] group-hover:text-[#047857]">
                Schedule corporate trip <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-5 h-44 overflow-hidden rounded-xl bg-slate-200">
              <img
                src={IMG_ECONOMY}
                alt="Corporate fleet sedan"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Professional Drivers */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#111315]">
                Verified Lagos drivers
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Identity-checked professionals ready for immediate dispatch.
              </p>
            </div>
            <Link to="/drivers" className="shrink-0">
              <Button variant="outline" size="sm">
                <span>All drivers</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-96 animate-pulse rounded-2xl bg-[#F5F6F8]"
                />
              ))}
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

      {/* Featured Rental Fleet */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#111315]">
              Featured vehicles
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Approved vehicles across Lagos Island and Mainland hubs.
            </p>
          </div>
          <Link to="/cars" className="shrink-0">
            <Button variant="outline" size="sm">
              <span>View full fleet</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-96 animate-pulse rounded-2xl bg-[#F5F6F8]"
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </section>

      {/* Bolt-Inspired Dark Partner Showcase ("Make money with ProDrivers") */}
      <section className="bg-[#111315] text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="flex items-center gap-2 rounded-full bg-white/10 p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setPartnerTab('DRIVER')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    partnerTab === 'DRIVER'
                      ? 'bg-[#32BB78] text-[#111315]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Drive with ProDrivers
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
                  List your fleet
                </button>
              </div>

              <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {partnerTab === 'DRIVER'
                  ? 'Earn consistently as a verified chauffeur.'
                  : 'Put your corporate fleet to work across Lagos.'}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-300">
                {partnerTab === 'DRIVER'
                  ? 'Set your hourly, daily, weekly, and monthly Naira rates, manage your calendar, and receive direct corporate and private bookings.'
                  : 'Onboard inspected SUVs, sedans, and vans with full availability controls, driver pairing, and Paystack-verified reservations.'}
              </p>

              <div className="mt-8 space-y-5">
                {(partnerTab === 'DRIVER'
                  ? [
                      {
                        n: '01.',
                        title: 'Submit FRSC & LASDRI credentials',
                        desc: 'Fast administrative document review unlocks public marketplace visibility.',
                      },
                      {
                        n: '02.',
                        title: 'Control your schedule & Naira rates',
                        desc: 'Block unavailable dates and accept requests without overlapping conflicts.',
                      },
                      {
                        n: '03.',
                        title: 'Track completed trips & earnings',
                        desc: 'Transparent trip ledger and verified digital booking history.',
                      },
                    ]
                  : [
                      {
                        n: '01.',
                        title: 'Register vehicles in minutes',
                        desc: 'Add specs, Lagos pickup location, and self-drive or chauffeur rules.',
                      },
                      {
                        n: '02.',
                        title: 'Conflict-free reservations',
                        desc: 'Our server blocks double bookings automatically across your active fleet.',
                      },
                      {
                        n: '03.',
                        title: 'Approve rentals & monitor earnings',
                        desc: 'Review bookings and manage maintenance windows from one dashboard.',
                      },
                    ]
                ).map((step) => (
                  <div key={step.n} className="flex items-start gap-4">
                    <span className="font-mono text-sm font-bold text-[#32BB78] pt-0.5">
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

              <div className="mt-8">
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
                        : 'Register Your Fleet'}
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
                      ? 'Professional driver in Lagos'
                      : 'Luxury SUV fleet vehicle in Lagos'
                  }
                  referrerPolicy="no-referrer"
                  className="h-80 w-full object-cover sm:h-[440px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Standards & Clearly Labelled Demo Testimonials */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2 text-[#047857]">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-bold tracking-wide">
                Safety & Reliability
              </span>
            </div>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#111315]">
              Built for Lagos standards.
            </h2>
            <ul className="mt-6 space-y-3.5 text-sm text-slate-600">
              {[
                'FRSC, LASDRI & NIN driver verification',
                'Transactional server-side conflict locking',
                'Upfront server-calculated Naira (₦) totals',
                'Paystack verified checkout & audit trail',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#047857]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {DEMO_TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="flex flex-col justify-between rounded-2xl bg-[#F5F6F8] p-6"
                >
                  <p className="text-sm leading-relaxed text-slate-700">
                    “{t.quote}”
                  </p>
                  <div className="mt-6 border-t border-slate-200/80 pt-4">
                    <p className="font-display text-sm font-bold text-[#111315]">
                      {t.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{t.role}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Demo testimonial
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
