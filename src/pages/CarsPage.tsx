import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { CarCard } from '../components/CarCard';
import { Button, EmptyState, Input, Select } from '../components/ui';
import { apiRequest } from '../lib/api';
import { type Vehicle } from '../lib/format';

const CATEGORIES = ['ALL', 'SUV', 'SEDAN', 'LUXURY', 'ECONOMY', 'VAN', 'BUS'];

export function CarsPage() {
  const [cars, setCars] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [location, setLocation] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [transmission, setTransmission] = useState('ALL');
  const [minSeats, setMinSeats] = useState('0');
  const [maxPrice, setMaxPrice] = useState('0');
  const [rentalOption, setRentalOption] = useState('ALL');

  const fetchCars = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (location !== 'ALL') params.set('location', location);
      if (category !== 'ALL') params.set('category', category);
      if (transmission !== 'ALL') params.set('transmission', transmission);
      if (Number(minSeats) > 0) params.set('minSeats', minSeats);
      if (Number(maxPrice) > 0) params.set('maxPrice', maxPrice);
      if (rentalOption !== 'ALL') params.set('rentalOption', rentalOption);

      const res = await apiRequest<{ cars: Vehicle[] }>(
        `/api/cars?${params.toString()}`
      );
      setCars(res.cars);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load vehicles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, [location, category, transmission, minSeats, maxPrice, rentalOption]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
          Car Rental Marketplace
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Reserve inspected SUVs, sedans, luxury cars, vans, and buses across Lagos—self-drive or chauffeur-driven.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search make, model, or Lagos area..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchCars();
              }}
            />
            <Button type="button" variant="secondary" onClick={fetchCars}>
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
          <option value="Yaba">Yaba</option>
        </Select>

        <Select
          value={transmission}
          onChange={(e) => setTransmission(e.target.value)}
        >
          <option value="ALL">Any Transmission</option>
          <option value="AUTOMATIC">Automatic</option>
          <option value="MANUAL">Manual</option>
        </Select>

        <Select value={minSeats} onChange={(e) => setMinSeats(e.target.value)}>
          <option value="0">Any Seating</option>
          <option value="5">5+ Seats</option>
          <option value="7">7+ Seats</option>
          <option value="14">14+ Seats</option>
        </Select>

        <Select
          value={rentalOption}
          onChange={(e) => setRentalOption(e.target.value)}
        >
          <option value="ALL">Chauffeur & Self-Drive</option>
          <option value="CHAUFFEUR">Chauffeur-Driven</option>
          <option value="SELF_DRIVE">Self-Drive Allowed</option>
        </Select>
      </div>

      {/* Category & Price Row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
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

        <div className="w-full sm:w-56">
          <Select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
            <option value="0">Any Daily Budget</option>
            <option value="80000">Up to ₦80,000 / day</option>
            <option value="150000">Up to ₦150,000 / day</option>
            <option value="250000">Up to ₦250,000 / day</option>
          </Select>
        </div>
      </div>

      {error ? (
        <div className="mt-8">
          <EmptyState
            title="Could not load fleet"
            description={error}
            action={<Button onClick={fetchCars}>Retry</Button>}
          />
        </div>
      ) : loading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-96 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : cars.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No vehicles match your filters"
            description="Adjust category, transmission, seating capacity, or daily budget to view available fleet listings."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQ('');
                  setLocation('ALL');
                  setCategory('ALL');
                  setTransmission('ALL');
                  setMinSeats('0');
                  setMaxPrice('0');
                  setRentalOption('ALL');
                }}
              >
                Reset Filters
              </Button>
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
  );
}
