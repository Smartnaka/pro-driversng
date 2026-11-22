import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button, Card, Input, Select, StatusText } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  formatDateTimeFull,
  formatNaira,
  type BookingRecord,
  type DriverProfile,
  type Vehicle,
} from '../lib/format';

interface AdminOverview {
  stats: {
    totalCustomers: number;
    registeredDrivers: number;
    registeredVehicles: number;
    totalBookings: number;
    grossRevenueNgn: number;
    commissionRatePct: number;
  };
  pendingDrivers: DriverProfile[];
  allDrivers: DriverProfile[];
  pendingVehicles: Vehicle[];
  allVehicles: Vehicle[];
  bookings: BookingRecord[];
  users: {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    isDemo: boolean;
    createdAt: string;
  }[];
}

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [tab, setTab] = useState<
    'VERIFICATIONS' | 'BOOKINGS' | 'USERS' | 'SETTINGS'
  >('VERIFICATIONS');
  const [loading, setLoading] = useState(true);
  const [commissionInput, setCommissionInput] = useState(10);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<AdminOverview>('/api/admin/overview');
      setData(res);
      setCommissionInput(res.stats.commissionRatePct);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to load admin overview.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  async function verifyDriver(driverId: number, status: 'VERIFIED' | 'REJECTED') {
    setError(null);
    try {
      await apiRequest(`/api/admin/drivers/${driverId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      setMessage(`Driver #${driverId} marked ${status}.`);
      loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update driver.');
    }
  }

  async function approveVehicle(vehicleId: number, status: 'APPROVED' | 'REJECTED') {
    setError(null);
    try {
      await apiRequest(`/api/admin/vehicles/${vehicleId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      setMessage(`Vehicle #${vehicleId} marked ${status}.`);
      loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update vehicle.');
    }
  }

  async function updateBooking(
    bookingId: number,
    payload: { status?: string; disputeStatus?: string }
  ) {
    setError(null);
    try {
      await apiRequest(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setMessage(`Booking #${bookingId} updated.`);
      loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking update failed.');
    }
  }

  async function toggleUserActive(userId: number, isActive: boolean) {
    setError(null);
    try {
      await apiRequest(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'User update failed.');
    }
  }

  async function saveCommission(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/api/admin/settings/commission', {
        method: 'PATCH',
        body: JSON.stringify({ commissionRatePct: commissionInput }),
      });
      setMessage(`Platform commission rate updated to ${commissionInput}%.`);
      loadOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Commission update failed.');
    }
  }

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            ProDrivers Operations & Admin Console
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Authenticated administrator: {user?.email}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>

      {message ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Top KPI Row */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: 'Total Customers', val: data.stats.totalCustomers },
          { label: 'Registered Drivers', val: data.stats.registeredDrivers },
          { label: 'Registered Vehicles', val: data.stats.registeredVehicles },
          { label: 'Total Bookings', val: data.stats.totalBookings },
          {
            label: 'Paid Gross Volume',
            val: formatNaira(data.stats.grossRevenueNgn),
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
            <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {kpi.val}
            </p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {[
          {
            id: 'VERIFICATIONS',
            label: `Verifications (${data.pendingDrivers.length + data.pendingVehicles.length})`,
          },
          { id: 'BOOKINGS', label: `Bookings & Disputes (${data.bookings.length})` },
          { id: 'USERS', label: `Users (${data.users.length})` },
          { id: 'SETTINGS', label: 'Commission Settings' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() =>
              setTab(t.id as 'VERIFICATIONS' | 'BOOKINGS' | 'USERS' | 'SETTINGS')
            }
            className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'VERIFICATIONS' ? (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Driver Verifications ({data.allDrivers.length})
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {data.allDrivers.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {d.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {d.location} · {d.yearsExperience} yrs
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusText status={d.verificationStatus} />
                    {d.verificationStatus !== 'VERIFIED' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => verifyDriver(d.id, 'VERIFIED')}
                      >
                        Verify
                      </Button>
                    ) : null}
                    {d.verificationStatus !== 'REJECTED' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyDriver(d.id, 'REJECTED')}
                      >
                        Reject
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Vehicle Approvals ({data.allVehicles.length})
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {data.allVehicles.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {v.year} {v.make} {v.model}
                    </p>
                    <p className="text-xs text-slate-500">
                      {v.plateNumber} · {v.location} · {formatNaira(v.dailyRateNgn)}/day
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusText status={v.approvalStatus} />
                    {v.approvalStatus !== 'APPROVED' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => approveVehicle(v.id, 'APPROVED')}
                      >
                        Approve
                      </Button>
                    ) : null}
                    {v.approvalStatus !== 'REJECTED' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveVehicle(v.id, 'REJECTED')}
                      >
                        Reject
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : tab === 'BOOKINGS' ? (
        <Card className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Pickup</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dispute</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                    {b.bookingCode}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    <p className="font-medium text-slate-900">{b.customerName}</p>
                    <p className="text-slate-500">{formatDateTimeFull(b.startDate)}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {b.pickupLocation}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {formatNaira(b.totalAmountNgn)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusText status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {b.disputeStatus === 'OPEN' ? (
                      <div className="space-y-1">
                        <span className="font-semibold text-amber-700">
                          OPEN: {b.disputeReason}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateBooking(b.id, { disputeStatus: 'RESOLVED' })
                          }
                        >
                          Resolve
                        </Button>
                      </div>
                    ) : (
                      <span className="text-slate-400">
                        {b.disputeStatus || 'NONE'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      className="h-8 py-1 text-xs w-36"
                      value={b.status}
                      onChange={(e) =>
                        updateBooking(b.id, { status: e.target.value })
                      }
                    >
                      {[
                        'PENDING',
                        'AWAITING_PAYMENT',
                        'CONFIRMED',
                        'IN_PROGRESS',
                        'COMPLETED',
                        'CANCELLED',
                        'REFUNDED',
                      ].map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : tab === 'USERS' ? (
        <Card className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-xs font-medium text-slate-900">
                    {u.fullName}
                    {u.isDemo ? (
                      <span className="ml-2 text-[11px] text-slate-400">
                        (Demo)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">
                    {u.role}
                  </td>
                  <td className="px-4 py-3">
                    <StatusText status={u.isActive ? 'AVAILABLE' : 'OFFLINE'} />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleUserActive(u.id, !u.isActive)}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="mt-6 max-w-md p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Platform Commission Management
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Applied automatically on the server to all new booking quotes and Paystack checkouts.
          </p>
          <form onSubmit={saveCommission} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Service Fee Percentage (%)
              </label>
              <Input
                type="number"
                min={0}
                max={40}
                value={commissionInput}
                onChange={(e) => setCommissionInput(Number(e.target.value))}
                required
              />
            </div>
            <Button type="submit" variant="primary">
              Save Commission Rate
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
