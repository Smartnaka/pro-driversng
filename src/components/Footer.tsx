import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#F5F6F8]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <span className="font-display text-2xl font-extrabold tracking-tight text-[#111315]">
              ProDrivers
            </span>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Your journey. Our professionals. Vetted chauffeurs and inspected fleet vehicles across Victoria Island, Ikoyi, Lekki, and Mainland Lagos.
            </p>
            <p className="mt-4 text-xs text-slate-500">
              Demo marketplace profiles and reviews are clearly labelled.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-[#111315]">
              Services
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-slate-600">
              <li>
                <Link to="/drivers" className="hover:text-[#111315]">
                  Hire a Driver
                </Link>
              </li>
              <li>
                <Link to="/cars" className="hover:text-[#111315]">
                  Rent a Car
                </Link>
              </li>
              <li>
                <Link to="/book?serviceType=AIRPORT_TRANSFER" className="hover:text-[#111315]">
                  Airport Transfers
                </Link>
              </li>
              <li>
                <Link to="/book?serviceType=CORPORATE" className="hover:text-[#111315]">
                  Corporate Mobility
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-[#111315]">
              Partner with ProDrivers
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-slate-600">
              <li>
                <Link to="/register?role=DRIVER" className="hover:text-[#111315]">
                  Sign up as a driver
                </Link>
              </li>
              <li>
                <Link to="/register?role=VEHICLE_OWNER" className="hover:text-[#111315]">
                  List your vehicles
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#111315]">
                  Partner sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-[#111315]">
              Lagos Hub
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-slate-600">
              <li>14 Adeola Odeku Street, Victoria Island, Lagos</li>
              <li>dispatch@prodrivers.ng</li>
              <li className="font-mono text-xs tabular-nums text-[#111315]">
                +234 (0) 700 776 3748
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} ProDrivers Nigeria. All rights reserved.</p>
          <p>Naira (₦) Settlement · Paystack Integrated</p>
        </div>
      </div>
    </footer>
  );
}
