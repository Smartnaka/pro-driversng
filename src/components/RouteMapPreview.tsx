import { MapPin, Navigation } from 'lucide-react';

export function RouteMapPreview({
  pickupLocation,
  destination,
}: {
  pickupLocation: string;
  destination?: string;
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const origin = pickupLocation || 'Victoria Island, Lagos';
  const dest = destination || origin;

  if (apiKey) {
    const mode = destination && destination !== pickupLocation ? 'directions' : 'place';
    const src =
      mode === 'directions'
        ? `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(
            apiKey
          )}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`
        : `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(
            apiKey
          )}&q=${encodeURIComponent(origin)}`;

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <iframe
          title="Google Maps Route Preview"
          src={src}
          className="h-56 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2 text-slate-900 font-medium">
            <MapPin className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>Pickup: {origin}</span>
          </div>
          {destination ? (
            <div className="flex items-center gap-2 text-slate-700">
              <Navigation className="h-4 w-4 text-slate-500 shrink-0" />
              <span>Destination: {destination}</span>
            </div>
          ) : null}
        </div>
        <span className="font-mono text-xs text-slate-500 whitespace-nowrap">
          Lagos Metro
        </span>
      </div>
      <p className="mt-3 border-t border-slate-200 pt-2.5 text-xs text-slate-500">
        Google Maps embed ready: add <code className="font-mono text-slate-700">VITE_GOOGLE_MAPS_API_KEY</code> to display live interactive map tiles.
      </p>
    </div>
  );
}
