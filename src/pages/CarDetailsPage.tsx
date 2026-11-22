import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  MapPin,
  Star,
} from 'lucide-react';
import { RouteMapPreview } from '../components/RouteMapPreview';
import { Button, Card, EmptyState, SafeImage, StatusText } from '../components/ui';
import { apiRequest } from '../lib/api';
import { formatDateTime, formatNaira, type Vehicle } from '../lib/format';

interface CarDetailResponse {
  car: Vehicle;
  images: { id: number; imageUrl: string; caption: string | null }[];
  reviews: {
    id: number;
    rating: number;
    comment: string;
    isDemo: boolean;
    createdAt: string;
    customerName: string;
  }[];
  unavailableWindows: {
    startDate: string;
    endDate: string;
    status?: string;
    reason?: string;
  }[];
}

export function CarDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState<CarDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<'CHAUFFEUR' | 'SELF_DRIVE'>(
    'CHAUFFEUR'
  );

  useEffect(() => {
    setLoading(true);
    apiRequest<CarDetailResponse>(`/api/cars/${id}`)
      .then((res) => {
        setData(res);
        setActiveImage(res.car.primaryImageUrl);
        if (!res.car.allowsChauffeur && res.car.allowsSelfDrive) {
          setSelectedOption('SELF_DRIVE');
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Vehicle not found.')
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          title="Vehicle listing unavailable"
          description={error || 'This vehicle could not be loaded.'}
          action={
            <Link to="/cars">
              <Button variant="outline">Back to Fleet</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { car, images, reviews, unavailableWindows } = data;
  const gallery =
    images.length > 0
      ? images
      : [{ id: 0, imageUrl: car.primaryImageUrl, caption: `${car.make} ${car.model}` }];

  const serviceType =
    selectedOption === 'CHAUFFEUR' ? 'CHAUFFEUR_CAR' : 'CAR_RENTAL';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/cars"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>All Rental Vehicles</span>
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Details */}
        <div className="space-y-8 lg:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <div className="aspect-[16/10] w-full">
              <SafeImage
                src={activeImage || car.primaryImageUrl}
                alt={`${car.year} ${car.make} ${car.model}`}
                fallbackType="car"
                className="h-full w-full object-cover"
              />
            </div>
            {gallery.length > 1 ? (
              <div className="flex gap-2 border-t border-slate-200 bg-white p-3">
                {gallery.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImage(img.imageUrl)}
                    className={`h-16 w-24 overflow-hidden rounded-lg border-2 transition-opacity cursor-pointer ${
                      activeImage === img.imageUrl
                        ? 'border-emerald-700'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <SafeImage
                      src={img.imageUrl}
                      alt={img.caption || car.model}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {car.category} · {car.year} · Listed by {car.ownerCompany}
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                  {car.make} {car.model}
                </h1>
              </div>
              <StatusText status={car.availabilityStatus} />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-100 py-5 text-sm sm:grid-cols-4">
              <div>
                <span className="block text-xs text-slate-500">Transmission</span>
                <span className="mt-0.5 font-medium text-slate-900">
                  {car.transmission === 'AUTOMATIC' ? 'Automatic' : 'Manual'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">Seating</span>
                <span className="mt-0.5 font-medium text-slate-900 tabular-nums">
                  {car.seats} passengers
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">Fuel Type</span>
                <span className="mt-0.5 font-medium text-slate-900">{car.fuelType}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">Pickup Hub</span>
                <span className="mt-0.5 font-medium text-slate-900">{car.location}</span>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Vehicle Overview
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {car.description}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold text-slate-500">
                  Included Features
                </h3>
                <ul className="mt-2.5 space-y-2 text-sm text-slate-700">
                  {car.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500">
                  Rental Requirements
                </h3>
                <ul className="mt-2.5 space-y-2 text-sm text-slate-700">
                  {car.requirements.map((r) => (
                    <li key={r} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-emerald-700" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                Pickup Location ({car.location})
              </h2>
            </div>
            <RouteMapPreview pickupLocation={car.location} />
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                Reserved & Blocked Dates
              </h2>
            </div>
            {unavailableWindows.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                No conflicting reservations recorded. Ready for immediate booking.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {unavailableWindows.map((win, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-4 py-3 text-xs"
                  >
                    <span className="font-mono text-slate-800 tabular-nums">
                      {formatDateTime(win.startDate)} — {formatDateTime(win.endDate)}
                    </span>
                    <span className="text-slate-500">
                      {win.reason || 'Reserved'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {reviews.length > 0 ? (
            <Card className="p-6">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Verified Trip Reviews ({reviews.length})
              </h2>
              <div className="mt-4 divide-y divide-slate-100">
                {reviews.map((rev) => (
                  <div key={rev.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">
                        {rev.customerName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-800">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        {rev.rating}.0
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600">{rev.comment}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(rev.createdAt)}
                      {rev.isDemo ? ' · Demo review' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        {/* Right Sticky Pricing & Booking Sidebar */}
        <div className="lg:col-span-4">
          <Card className="sticky top-24 p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Rental Options & Pricing
            </h2>

            <div className="mt-4 flex gap-1.5 rounded-lg bg-slate-100 p-1">
              {car.allowsChauffeur ? (
                <button
                  type="button"
                  onClick={() => setSelectedOption('CHAUFFEUR')}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    selectedOption === 'CHAUFFEUR'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Chauffeur-Driven
                </button>
              ) : null}
              {car.allowsSelfDrive ? (
                <button
                  type="button"
                  onClick={() => setSelectedOption('SELF_DRIVE')}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    selectedOption === 'SELF_DRIVE'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Self-Drive
                </button>
              ) : null}
            </div>

            <div className="mt-5 divide-y divide-slate-100 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Daily Vehicle Rate</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatNaira(car.dailyRateNgn)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Weekly Rate</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatNaira(car.weeklyRateNgn)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Monthly Rate</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatNaira(car.monthlyRateNgn)}
                </span>
              </div>
              {selectedOption === 'CHAUFFEUR' ? (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-600">Fleet Chauffeur Surcharge</span>
                  <span className="font-mono font-medium text-emerald-700 tabular-nums">
                    +{formatNaira(car.chauffeurSurchargeDailyNgn)} / day
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              <Link
                to={`/book?vehicleId=${car.id}&rentalOption=${selectedOption}&serviceType=${serviceType}`}
              >
                <Button variant="primary" size="lg" className="w-full">
                  Reserve {car.make} {car.model}
                </Button>
              </Link>
              {car.isDemo ? (
                <p className="mt-3 text-center text-xs text-slate-400">
                  Demo vehicle listing
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
