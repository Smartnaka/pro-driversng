import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Compass,
  FileCheck2,
  ShieldAlert,
  Upload,
  UserCheck,
} from 'lucide-react';
import { DashboardShell, type DashboardNavItem } from '../components/DashboardShell';
import {
  Button,
  Card,
  Input,
  SafeImage,
  Select,
  StatusText,
  Textarea,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { LAGOS_LOCATIONS, type DriverProfile } from '../lib/format';
import {
  AVATAR_PRESETS,
  FLEET_PHOTO_PRESETS,
  readDocumentFileAsDataUrl,
  readImageFileAsDataUrl,
} from '../lib/media';

const DRIVER_CATEGORIES = [
  'Executive Chauffeur',
  'Corporate Fleet',
  'Airport Protocol',
  'Intercity Travel',
  'Family & School Runs',
];

const VEHICLE_FEATURES = [
  'Full AC',
  'Comprehensive Insurance',
  'Leather Interior',
  'Bluetooth Audio',
  'Dashcam Security',
  'USB Charging',
];

export function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Shared user fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '+234 ');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [defaultPickupLocation, setDefaultPickupLocation] = useState(
    user?.defaultPickupLocation || LAGOS_LOCATIONS[0]
  );

  // Driver fields
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [driverLocation, setDriverLocation] = useState(LAGOS_LOCATIONS[0]);
  const [yearsExperience, setYearsExperience] = useState(3);
  const [bio, setBio] = useState('');
  const [categories, setCategories] = useState<string[]>(['Executive Chauffeur']);
  const [languagesInput, setLanguagesInput] = useState('English, Yoruba');
  const [hourlyRateNgn, setHourlyRateNgn] = useState(3500);
  const [dailyRateNgn, setDailyRateNgn] = useState(22000);
  const [weeklyRateNgn, setWeeklyRateNgn] = useState(130000);
  const [monthlyRateNgn, setMonthlyRateNgn] = useState(450000);
  const [docsCount, setDocsCount] = useState(0);

  const [docType, setDocType] = useState('DRIVERS_LICENSE');
  const [docNumber, setDocNumber] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');

  // Owner fields
  const [vehiclesCount, setVehiclesCount] = useState(0);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2023);
  const [plateNumber, setPlateNumber] = useState('');
  const [category, setCategory] = useState('SEDAN');
  const [transmission, setTransmission] = useState('AUTOMATIC');
  const [seats, setSeats] = useState(5);
  const [vehicleLocation, setVehicleLocation] = useState(LAGOS_LOCATIONS[0]);
  const [vehicleDailyRate, setVehicleDailyRate] = useState(95000);
  const [vehicleImageUrl, setVehicleImageUrl] = useState(FLEET_PHOTO_PRESETS[1].url);
  const [vehicleFeatures, setVehicleFeatures] = useState<string[]>([
    'Full AC',
    'Comprehensive Insurance',
  ]);
  const [allowsSelfDrive, setAllowsSelfDrive] = useState(true);
  const [vehicleDesc, setVehicleDesc] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await apiRequest<{
          user: NonNullable<typeof user>;
          driverProfile: DriverProfile | null;
          driverDocsCount: number;
          ownerVehiclesCount: number;
        }>('/api/auth/me');

        setFullName(res.user.fullName);
        setPhone(res.user.phone || '+234 ');
        setAvatarUrl(res.user.avatarUrl || '');
        setDefaultPickupLocation(
          res.user.defaultPickupLocation || LAGOS_LOCATIONS[0]
        );
        setDocsCount(res.driverDocsCount || 0);
        setVehiclesCount(res.ownerVehiclesCount || 0);

        if (res.driverProfile) {
          setDriverProfile(res.driverProfile);
          setDriverLocation(res.driverProfile.location);
          setYearsExperience(res.driverProfile.yearsExperience);
          setBio(res.driverProfile.bio);
          setCategories(res.driverProfile.categories);
          setLanguagesInput(res.driverProfile.languages.join(', '));
          setHourlyRateNgn(res.driverProfile.hourlyRateNgn);
          setDailyRateNgn(res.driverProfile.dailyRateNgn);
          setWeeklyRateNgn(res.driverProfile.weeklyRateNgn);
          setMonthlyRateNgn(res.driverProfile.monthlyRateNgn);
          if (!res.user.avatarUrl && res.driverProfile.photoUrl) {
            setAvatarUrl(res.driverProfile.photoUrl);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load onboarding state.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const role = user?.role || 'CUSTOMER';
  const totalSteps = role === 'DRIVER' ? 3 : 2;
  const dashboardRoute =
    role === 'DRIVER'
      ? '/dashboard/driver'
      : role === 'VEHICLE_OWNER'
        ? '/dashboard/owner'
        : role === 'ADMIN'
          ? '/admin'
          : '/dashboard';

  const navItems: DashboardNavItem[] = [
    { id: 'onboarding', label: 'Setup Checklist', icon: Compass },
    { id: 'dashboard', label: 'Open Dashboard', icon: CheckCircle2, to: dashboardRoute },
  ];

  async function completeOnboardingAndGo(targetRoute: string) {
    setSaving(true);
    setError(null);
    try {
      await apiRequest('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ onboardingCompleted: true }),
      });
      await refreshUser();
      navigate(targetRoute);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to finish setup.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCustomerSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiRequest('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          avatarUrl: avatarUrl || null,
          defaultPickupLocation,
          onboardingCompleted: true,
        }),
      });
      await refreshUser();
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save customer profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDriverStep1(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiRequest('/api/driver/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          location: driverLocation,
          yearsExperience,
          photoUrl: avatarUrl || undefined,
        }),
      });
      if (avatarUrl) {
        await apiRequest('/api/auth/me', {
          method: 'PATCH',
          body: JSON.stringify({ avatarUrl }),
        });
      }
      await refreshUser();
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save driver details.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDriverStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const langs = languagesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await apiRequest('/api/driver/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          bio,
          categories: categories.length > 0 ? categories : ['Executive Chauffeur'],
          languages: langs.length > 0 ? langs : ['English'],
          hourlyRateNgn,
          dailyRateNgn,
          weeklyRateNgn,
          monthlyRateNgn,
        }),
      });
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save qualifications.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDriverSubmitDoc(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (docNumber.trim().length < 4) {
      setError('Enter a valid licence or ID number.');
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/api/driver/documents', {
        method: 'POST',
        body: JSON.stringify({
          docType,
          documentNumber: docNumber.trim(),
          fileUrl: docFileUrl || undefined,
        }),
      });
      setDocNumber('');
      setDocFileUrl('');
      setDocsCount((c) => c + 1);
      setMessage('Verification document submitted and queued for admin review.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Document upload failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleOwnerStep1(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiRequest('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          avatarUrl: avatarUrl || null,
          defaultPickupLocation: vehicleLocation,
        }),
      });
      await refreshUser();
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save contact info.');
    } finally {
      setSaving(false);
    }
  }

  async function handleOwnerAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiRequest('/api/owner/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          make: make.trim(),
          model: model.trim(),
          year,
          plateNumber: plateNumber.trim(),
          category,
          transmission,
          seats,
          location: vehicleLocation,
          dailyRateNgn: vehicleDailyRate,
          description: vehicleDesc.trim(),
          features: vehicleFeatures,
          primaryImageUrl: vehicleImageUrl,
          allowsSelfDrive,
          allowsChauffeur: true,
        }),
      });
      setVehiclesCount((c) => c + 1);
      await completeOnboardingAndGo('/dashboard/owner');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to register vehicle.');
      setSaving(false);
    }
  }

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function toggleFeature(feat: string) {
    setVehicleFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  }

  return (
    <DashboardShell
      workspaceLabel={
        role === 'DRIVER'
          ? 'Driver Onboarding'
          : role === 'VEHICLE_OWNER'
            ? 'Fleet Onboarding'
            : 'Customer Onboarding'
      }
      sectionLabel={`Step ${step} of ${totalSteps}`}
      title="Welcome to ProDrivers"
      subtitle="Complete your profile setup so you can start using your workspace right away."
      navItems={navItems}
      activeNav="onboarding"
      primaryAction={
        <Button
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() => completeOnboardingAndGo(dashboardRoute)}
        >
          Finish Later
        </Button>
      }
    >
      {/* Progress Bar */}
      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600">
          <span>
            Setup Progress · Step {step} of {totalSteps}
          </span>
          <span className="font-mono tabular-nums text-[#111315]">
            {Math.round((step / totalSteps) * 100)}%
          </span>
        </div>
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#32BB78] transition-all duration-200"
            style={{ width: `${Math.round((step / totalSteps) * 100)}%` }}
          />
        </div>
      </Card>

      {message ? (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white border border-slate-200" />
      ) : role === 'CUSTOMER' ? (
        step === 1 ? (
          <Card className="p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold text-[#111315]">
              Confirm Your Contact & Default Lagos Pickup
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Your details pre-fill every driver or car reservation automatically.
            </p>

            <form onSubmit={handleCustomerSave} className="mt-6 space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <SafeImage
                  src={avatarUrl || null}
                  alt={fullName}
                  fallbackType="driver"
                  className="h-16 w-16 rounded-full border border-slate-200 object-cover object-top"
                />
                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#111315] hover:bg-[#F5F6F8]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Profile Photo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          setAvatarUrl(await readImageFileAsDataUrl(f, 480));
                        } catch (err: unknown) {
                          setError(err instanceof Error ? err.message : 'Photo error.');
                        }
                      }}
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    {AVATAR_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setAvatarUrl(p.url)}
                        className={`h-8 w-8 overflow-hidden rounded-full border-2 cursor-pointer ${
                          avatarUrl === p.url ? 'border-[#32BB78]' : 'border-transparent'
                        }`}
                      >
                        <img
                          src={p.url}
                          alt={p.label}
                          className="h-full w-full object-cover object-top"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Full Name
                  </label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Phone Number
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Default Pickup Area
                  </label>
                  <Select
                    value={defaultPickupLocation}
                    onChange={(e) => setDefaultPickupLocation(e.target.value)}
                  >
                    {LAGOS_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <Button type="submit" variant="primary" disabled={saving}>
                <span>{saving ? 'Saving...' : 'Save & Continue'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" />
            <h2 className="mt-4 font-display text-2xl font-bold text-[#111315]">
              Your Customer Account is Ready
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              You can now reserve vetted professional drivers, self-drive sedans, or chauffeur-driven SUVs across Lagos.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/book">
                <Button variant="primary">Book Your First Trip</Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline">Go to Customer Dashboard</Button>
              </Link>
            </div>
          </Card>
        )
      ) : role === 'DRIVER' ? (
        step === 1 ? (
          <Card className="p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold text-[#111315]">
              1. Driver Identity, Base & Experience
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Clients review your portrait, Lagos base area, and driving tenure before sending a booking request.
            </p>

            <form onSubmit={handleDriverStep1} className="mt-6 space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <SafeImage
                  src={avatarUrl || driverProfile?.photoUrl || null}
                  alt={fullName}
                  fallbackType="driver"
                  className="h-20 w-20 rounded-2xl border border-slate-200 object-cover object-top"
                />
                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#111315] hover:bg-[#F5F6F8]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Driver Photo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          setAvatarUrl(await readImageFileAsDataUrl(f, 640));
                        } catch (err: unknown) {
                          setError(err instanceof Error ? err.message : 'Photo error.');
                        }
                      }}
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    {AVATAR_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setAvatarUrl(p.url)}
                        className={`h-8 w-8 overflow-hidden rounded-full border-2 cursor-pointer ${
                          avatarUrl === p.url ? 'border-[#32BB78]' : 'border-transparent'
                        }`}
                      >
                        <img
                          src={p.url}
                          alt={p.label}
                          className="h-full w-full object-cover object-top"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Full Name
                  </label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Phone Number
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Primary Lagos Location
                  </label>
                  <Select
                    value={driverLocation}
                    onChange={(e) => setDriverLocation(e.target.value)}
                  >
                    {LAGOS_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Years of Professional Driving Experience
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={yearsExperience}
                    onChange={(e) =>
                      setYearsExperience(Math.max(1, Number(e.target.value) || 1))
                    }
                    required
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" disabled={saving}>
                <span>{saving ? 'Saving...' : 'Save & Continue'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        ) : step === 2 ? (
          <Card className="p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold text-[#111315]">
              2. Qualifications, Biography & Naira Rates
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Select the service categories you specialize in and set your standard Naira rates.
            </p>

            <form onSubmit={handleDriverStep2} className="mt-6 space-y-5">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-700">
                  Driving Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {DRIVER_CATEGORIES.map((cat) => {
                    const selected = categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#111315] bg-[#111315] text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-[#F5F6F8]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Languages Spoken (comma-separated)
                </label>
                <Input
                  value={languagesInput}
                  onChange={(e) => setLanguagesInput(e.target.value)}
                  placeholder="English, Yoruba, Igbo"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Profile Description
                </label>
                <Textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Highlight defensive driving training, corporate executive experience, and familiarity with Lagos routes."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-600">Hourly (₦)</label>
                  <Input
                    type="number"
                    min={1000}
                    value={hourlyRateNgn}
                    onChange={(e) => setHourlyRateNgn(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">Daily (₦)</label>
                  <Input
                    type="number"
                    min={5000}
                    value={dailyRateNgn}
                    onChange={(e) => setDailyRateNgn(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">Weekly (₦)</label>
                  <Input
                    type="number"
                    min={20000}
                    value={weeklyRateNgn}
                    onChange={(e) => setWeeklyRateNgn(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">Monthly (₦)</label>
                  <Input
                    type="number"
                    min={80000}
                    value={monthlyRateNgn}
                    onChange={(e) => setMonthlyRateNgn(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  <span>{saving ? 'Saving...' : 'Save & Continue to Documents'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#111315]">
                  3. Driver’s Licence & Verification Documents
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Submit your FRSC Driver’s Licence, LASDRI certificate, or NIN. Profile status remains pending until reviewed by ProDrivers Operations.
                </p>
              </div>
              <StatusText status={driverProfile?.verificationStatus || 'PENDING'} />
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <span>
                You will appear in public search and be able to accept confirmed bookings once your verification status changes to Verified. Documents uploaded so far: <strong className="font-mono tabular-nums">{docsCount}</strong>.
              </span>
            </div>

            <form onSubmit={handleDriverSubmitDoc} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Document Type
                  </label>
                  <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                    <option value="DRIVERS_LICENSE">FRSC Driver’s Licence</option>
                    <option value="LASDRI_CERT">LASDRI Certification</option>
                    <option value="NIN_ID">National Identity (NIN)</option>
                    <option value="BACKGROUND_CHECK">Police Background Clearance</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Document / Licence Number
                  </label>
                  <Input
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="e.g. LND-882910-FRSC"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Upload Scan or Photo (optional, PNG/JPEG/PDF under 600KB)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#111315] hover:bg-[#F5F6F8]">
                    <FileCheck2 className="h-3.5 w-3.5" />
                    <span>{docFileUrl ? 'File Attached' : 'Attach Document File'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          setDocFileUrl(await readDocumentFileAsDataUrl(f));
                        } catch (err: unknown) {
                          setError(err instanceof Error ? err.message : 'File error.');
                        }
                      }}
                    />
                  </label>
                  <Button type="submit" variant="secondary" size="sm" disabled={saving}>
                    {saving ? 'Submitting...' : 'Submit Document'}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={saving}
                onClick={() => completeOnboardingAndGo('/dashboard/driver')}
              >
                <UserCheck className="h-4 w-4" />
                <span>Finish & Open Driver Workspace</span>
              </Button>
            </div>
          </Card>
        )
      ) : step === 1 ? (
        <Card className="p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold text-[#111315]">
            1. Fleet Partner Contact & Base
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Confirm your primary contact details for rental booking alerts and payout records.
          </p>

          <form onSubmit={handleOwnerStep1} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Full Name
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Contact Phone
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Primary Fleet Location
                </label>
                <Select
                  value={vehicleLocation}
                  onChange={(e) => setVehicleLocation(e.target.value)}
                >
                  {LAGOS_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <Button type="submit" variant="primary" disabled={saving}>
              <span>{saving ? 'Saving...' : 'Continue to Add First Vehicle'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#111315]">
                2. Register Your First Vehicle
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Vehicles added now are submitted with Pending approval status until verified by ProDrivers Operations. Registered vehicles: <strong className="font-mono tabular-nums">{vehiclesCount}</strong>.
              </p>
            </div>
            <StatusText status="PENDING" />
          </div>

          <form onSubmit={handleOwnerAddVehicle} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Input
                placeholder="Make (e.g. Toyota)"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                required
              />
              <Input
                placeholder="Model (e.g. Camry)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
              <Input
                type="number"
                min={1995}
                max={2028}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                required
              />
              <Input
                placeholder="Plate (e.g. LND-204-AA)"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="SUV">SUV</option>
                <option value="SEDAN">Sedan</option>
                <option value="LUXURY">Luxury</option>
                <option value="ECONOMY">Economy</option>
                <option value="VAN">Van</option>
                <option value="BUS">Bus</option>
              </Select>
              <Select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
              >
                <option value="AUTOMATIC">Automatic</option>
                <option value="MANUAL">Manual</option>
              </Select>
              <Input
                type="number"
                min={2}
                max={30}
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                placeholder="Seats"
              />
              <Input
                type="number"
                min={5000}
                value={vehicleDailyRate}
                onChange={(e) => setVehicleDailyRate(Number(e.target.value))}
                placeholder="Daily Rate (₦)"
                required
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-700">
                Vehicle Photo
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <SafeImage
                  src={vehicleImageUrl}
                  alt="Vehicle preview"
                  fallbackType="car"
                  className="h-20 w-32 rounded-xl border border-slate-200 object-cover"
                />
                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#111315] hover:bg-[#F5F6F8]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          setVehicleImageUrl(await readImageFileAsDataUrl(f, 960));
                        } catch (err: unknown) {
                          setError(err instanceof Error ? err.message : 'Photo error.');
                        }
                      }}
                    />
                  </label>
                  <Select
                    value={
                      FLEET_PHOTO_PRESETS.some((p) => p.url === vehicleImageUrl)
                        ? vehicleImageUrl
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) setVehicleImageUrl(e.target.value);
                    }}
                  >
                    <option value="">Or pick a curated studio photo...</option>
                    {FLEET_PHOTO_PRESETS.map((p) => (
                      <option key={p.label} value={p.url}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-700">
                Included Features
              </p>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_FEATURES.map((feat) => {
                  const active = vehicleFeatures.includes(feat);
                  return (
                    <button
                      key={feat}
                      type="button"
                      onClick={() => toggleFeature(feat)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                        active
                          ? 'border-[#111315] bg-[#111315] text-white'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {feat}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowsSelfDrive}
                onChange={(e) => setAllowsSelfDrive(e.target.checked)}
              />
              <span>Allow Self-Drive Bookings (Chauffeur bookings enabled by default)</span>
            </label>

            <Textarea
              rows={2}
              value={vehicleDesc}
              onChange={(e) => setVehicleDesc(e.target.value)}
              placeholder="Condition notes, fuel policy, and pickup instructions..."
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => completeOnboardingAndGo('/dashboard/owner')}
                >
                  Skip for Now
                </Button>
              </div>
              <Button type="submit" variant="primary" disabled={saving}>
                <Car className="h-4 w-4" />
                <span>{saving ? 'Submitting Vehicle...' : 'Submit Vehicle & Open Portal'}</span>
              </Button>
            </div>
          </form>
        </Card>
      )}
    </DashboardShell>
  );
}
