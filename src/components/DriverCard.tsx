import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import { formatNaira, type DriverProfile } from '../lib/format';
import { Button, SafeImage, StatusText } from './ui';

export function DriverCard({ driver }: { driver: DriverProfile }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-[#F5F6F8] transition-colors duration-150 hover:bg-[#ECEEF2]">
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-200">
        <SafeImage
          src={driver.photoUrl}
          alt={driver.fullName}
          fallbackType="driver"
          className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[#111315]">
              {driver.fullName}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              {driver.location}
              <span aria-hidden="true"> · </span>
              {driver.yearsExperience} yrs
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-[#111315] tabular-nums shrink-0">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            <span>{Number(driver.ratingAvg).toFixed(2)}</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-600 line-clamp-2">
          {driver.categories.join(' · ')}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-4">
          <div>
            <p className="font-mono text-base font-bold text-[#111315] tabular-nums">
              {formatNaira(driver.dailyRateNgn)}
              <span className="font-sans text-xs font-normal text-slate-500">
                {' '}
                / day
              </span>
            </p>
            <p className="font-mono text-xs text-slate-500 tabular-nums">
              {formatNaira(driver.hourlyRateNgn)} / hr
            </p>
          </div>
          <StatusText status={driver.availabilityStatus} />
        </div>

        <div className="mt-4">
          <Link to={`/drivers/${driver.id}`} className="block">
            <Button variant="secondary" size="sm" className="w-full justify-between">
              <span>View profile</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {driver.isDemo ? (
          <p className="mt-2.5 text-[11px] text-slate-400">
            Demo driver profile
          </p>
        ) : null}
      </div>
    </div>
  );
}
