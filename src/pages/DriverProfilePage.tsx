import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { Button, Card, EmptyState, SafeImage, StatusText } from '../components/ui';
import { apiRequest } from '../lib/api';
import {
  formatDateTime,
  formatNaira,
  type DriverProfile,
} from '../lib/format';

interface DriverDetailResponse {
  driver: DriverProfile;
  verifiedDocuments: {
    id: number;
    docType: string;
    status: string;
    verifiedAt: string | null;
  }[];
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

export function DriverProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState<DriverDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiRequest<DriverDetailResponse>(`/api/drivers/${id}`)
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Driver not found.')
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          title="Driver profile unavailable"
          description={error || 'This driver profile could not be loaded.'}
          action={
            <Link to="/drivers">
              <Button variant="outline">Back to Drivers</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { driver, verifiedDocuments, reviews, unavailableWindows } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/drivers"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>All Professional Drivers</span>
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Main Profile */}
        <div className="space-y-8 lg:col-span-8">
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <SafeImage
                  src={driver.photoUrl}
                  alt={driver.fullName}
                  fallbackType="driver"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                    {driver.fullName}
                  </h1>
                  <StatusText status={driver.availabilityStatus} />
                </div>

                <p className="mt-1.5 text-sm text-slate-600">
                  {driver.location}
                  <span aria-hidden="true"> · </span>
                  {driver.yearsExperience} years experience
                  <span aria-hidden="true"> · </span>
                  {driver.totalTrips} completed trips
                </p>

                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-900 tabular-nums">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    {Number(driver.ratingAvg).toFixed(2)} rating
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    Verified Driver
                  </span>
                </div>

                {driver.isDemo ? (
                  <p className="mt-3 text-xs text-slate-400">
                    Demo driver profile seeded for ProDrivers preview
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Professional Biography
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {driver.bio}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 sm:grid-cols-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-500">
                  Driving Categories
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-800">
                  {driver.categories.map((cat) => (
                    <li key={cat}>{cat}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500">
                  Service Locations
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-800">
                  {driver.serviceAreas.map((area) => (
                    <li key={area} className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500">
                  Languages Spoken
                </h3>
                <p className="mt-2 text-sm text-slate-800">
                  {driver.languages.join(' · ')}
                </p>
              </div>
            </div>
          </Card>

          {/* Verified Credentials */}
          <Card className="p-6">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Verified Compliance Documents
            </h2>
            {verifiedDocuments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Identity & licensing documents are verified by ProDrivers Operations.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {verifiedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span className="text-xs font-medium text-slate-800">
                      {doc.docType.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Availability Schedule */}
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                Availability Calendar & Reserved Windows
              </h2>
            </div>
            {unavailableWindows.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                Open schedule: no conflicting trips or blocked dates currently recorded.
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
                      {win.reason || 'Reserved Trip'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Customer Reviews */}
          <Card className="p-6">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Customer Reviews ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No customer reviews submitted yet.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {reviews.map((rev) => (
                  <div key={rev.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">
                        {rev.customerName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-800 tabular-nums">
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
            )}
          </Card>
        </div>

        {/* Right Sticky Pricing & Booking Sidebar */}
        <div className="lg:col-span-4">
          <Card className="sticky top-24 p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Hire Rates (Naira)
            </h2>
            <div className="mt-4 divide-y divide-slate-100 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Hourly</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatNaira(driver.hourlyRateNgn)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Daily (up to 12 hrs)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatNaira(driver.dailyRateNgn)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Weekly (7 days)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatNaira(driver.weeklyRateNgn)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">Monthly (30 days)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatNaira(driver.monthlyRateNgn)}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link to={`/book?driverId=${driver.id}&serviceType=DRIVER_HIRE`}>
                <Button variant="primary" size="lg" className="w-full">
                  Book {driver.fullName.split(' ')[0]} Now
                </Button>
              </Link>
              <Link to="/cars">
                <Button variant="outline" className="w-full mt-2">
                  Need a Vehicle Too? Browse Fleet
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
