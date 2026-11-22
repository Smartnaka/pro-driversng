import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatNaira, type Vehicle } from '../lib/format';
import { Button, SafeImage, StatusText } from './ui';

export function CarCard({ car }: { car: Vehicle }) {
  const rentalModes = [
    car.allowsChauffeur ? 'Chauffeur' : null,
    car.allowsSelfDrive ? 'Self-drive' : null,
  ]
    .filter(Boolean)
    .join(' / ');

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-[#F5F6F8] transition-colors duration-150 hover:bg-[#ECEEF2]">
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-200">
        <SafeImage
          src={car.primaryImageUrl}
          alt={`${car.year} ${car.make} ${car.model}`}
          fallbackType="car"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {car.category}
              <span aria-hidden="true"> · </span>
              {car.year}
            </p>
            <h3 className="mt-0.5 font-display text-lg font-bold text-[#111315]">
              {car.make} {car.model}
            </h3>
          </div>
          <StatusText status={car.availabilityStatus} />
        </div>

        <p className="mt-2 text-xs text-slate-600">
          {car.transmission === 'AUTOMATIC' ? 'Automatic' : 'Manual'}
          <span aria-hidden="true"> · </span>
          {car.seats} seats
          <span aria-hidden="true"> · </span>
          {car.location}
        </p>

        <p className="mt-1.5 text-xs text-slate-500">{rentalModes}</p>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-4">
          <p className="font-mono text-base font-bold text-[#111315] tabular-nums">
            {formatNaira(car.dailyRateNgn)}
            <span className="font-sans text-xs font-normal text-slate-500">
              {' '}
              / day
            </span>
          </p>
          <Link to={`/cars/${car.id}`}>
            <Button variant="secondary" size="sm">
              <span>Book car</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {car.isDemo ? (
          <p className="mt-2.5 text-[11px] text-slate-400">
            Demo vehicle listing
          </p>
        ) : null}
      </div>
    </div>
  );
}
