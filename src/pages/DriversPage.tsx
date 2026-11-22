import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { DriverCard } from '../components/DriverCard';
import { Button, EmptyState, Input, Select } from '../components/ui';
import { apiRequest } from '../lib/api';
import { type DriverProfile } from '../lib/format';

export function DriversPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [location, setLocation] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');
  const [minExp, setMinExp] = useState('0');
  const [maxPrice, setMaxPrice] = useState('0');
  const [category, setCategory] = useState('ALL');

  const fetchDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (location !== 'ALL') params.set('location', location);
      if (availability !== 'ALL') params.set('availability', availability);
      if (Number(minExp) > 0) params.set('minExp', minExp);
      if (Number(maxPrice) > 0) params.set('maxPrice', maxPrice);
      if (category !== 'ALL') params.set('category', category);

      const res = await apiRequest<{ drivers: DriverProfile[] }>(
        `/api/drivers?${params.toString()}`
      );
      setDrivers(res.drivers);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load drivers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [location, availability, minExp, maxPrice, category]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
          Hire a Professional Driver
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Browse verified Nigerian chauffeurs available for hourly, daily, weekly, and monthly engagements across Lagos.
        </p>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <div className="relative flex gap-2">
            <Input
              placeholder="Search name or Lagos corridor..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchDrivers();
              }}
            />
            <Button type="button" variant="secondary" onClick={fetchDrivers}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Select value={location} onChange={(e) => setLocation(e.target.value)}>
          <option value="ALL">All Lagos Locations</option>
          <option value="Victoria Island">Victoria Island</option>
          <option value="Ikoyi">Ikoyi</option>
          <option value="Lekki">Lekki Phase 1</option>
          <option value="Ikeja">Ikeja GRA</option>
        </Select>

        <Select value={availability} onChange={(e) => setAvailability(e.target.value)}>
          <option value="ALL">Any Availability</option>
          <option value="AVAILABLE">Available Now</option>
          <option value="BUSY">Busy</option>
        </Select>

        <Select value={minExp} onChange={(e) => setMinExp(e.target.value)}>
          <option value="0">Any Experience</option>
          <option value="5">5+ Years</option>
          <option value="8">8+ Years</option>
          <option value="10">10+ Years</option>
        </Select>

        <Select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
          <option value="0">Any Daily Rate</option>
          <option value="25000">Up to ₦25,000 / day</option>
          <option value="30000">Up to ₦30,000 / day</option>
          <option value="40000">Up to ₦40,000 / day</option>
        </Select>
      </div>

      {/* Category Filter Tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[
          'ALL',
          'Executive Chauffeur',
          'Corporate Fleet',
          'Airport Transfer',
          'Intercity',
          'Protocol & VIP',
        ].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              category === cat
                ? 'bg-[#111315] text-white'
                : 'bg-[#F5F6F8] text-slate-700 hover:bg-[#ECEEF2]'
            }`}
          >
            {cat === 'ALL' ? 'All Categories' : cat}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-8">
          <EmptyState
            title="Could not load drivers"
            description={error}
            action={<Button onClick={fetchDrivers}>Try Again</Button>}
          />
        </div>
      ) : loading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-96 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No drivers match your current filters"
            description="Adjust your Lagos location, daily rate cap, or driving category to see more vetted chauffeurs."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQ('');
                  setLocation('ALL');
                  setAvailability('ALL');
                  setMinExp('0');
                  setMaxPrice('0');
                  setCategory('ALL');
                }}
              >
                Reset Filters
              </Button>
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
  );
}
