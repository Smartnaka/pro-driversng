import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Car,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Compass,
  LogOut,
  Menu,
  Plus,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { formatDateTimeFull, type NotificationItem } from '../lib/format';
import { SafeImage } from './ui';

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  to?: string;
}

interface DashboardShellProps {
  workspaceLabel: string;
  sectionLabel: string;
  title: string;
  subtitle?: string;
  navItems: DashboardNavItem[];
  activeNav: string;
  onNavChange?: (id: string) => void;
  primaryAction?: React.ReactNode;
  children: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Customer',
  DRIVER: 'Professional Driver',
  VEHICLE_OWNER: 'Fleet Partner',
  ADMIN: 'Operations Admin',
};

export function DashboardShell({
  workspaceLabel,
  sectionLabel,
  title,
  subtitle,
  navItems,
  activeNav,
  onNavChange,
  primaryAction,
  children,
}: DashboardShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoadingNotifs(true);
    try {
      const res = await apiRequest<{
        notifications: NotificationItem[];
        unreadCount: number;
      }>('/api/notifications');
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // Keep quiet in header polling if transiently offline
    } finally {
      setLoadingNotifs(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  async function handleNotificationClick(item: NotificationItem) {
    if (!item.isRead) {
      try {
        await apiRequest(`/api/notifications/${item.id}/read`, {
          method: 'PATCH',
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Ignore read error
      }
    }
    setNotifOpen(false);
    if (item.linkUrl && item.linkUrl.startsWith('/')) {
      navigate(item.linkUrl);
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore error
    }
  }

  async function handleSignOut() {
    setProfileOpen(false);
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  }

  const dashboardHome =
    user?.role === 'ADMIN'
      ? '/admin'
      : user?.role === 'DRIVER'
        ? '/dashboard/driver'
        : user?.role === 'VEHICLE_OWNER'
          ? '/dashboard/owner'
          : '/dashboard';

  const initials = (user?.fullName || 'PD')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const renderNavList = (closeDrawer?: () => void) => (
    <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-xs font-medium text-slate-400">
            {workspaceLabel}
          </p>
          <nav className="mt-2 space-y-1" aria-label="Workspace navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              const classes = `flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer min-h-[42px] ${
                isActive
                  ? 'bg-[#111315] text-white'
                  : 'text-slate-700 hover:bg-[#F5F6F8] hover:text-[#111315]'
              }`;

              if (item.to) {
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    onClick={() => closeDrawer?.()}
                    className={classes}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && Number(item.badge) > 0 ? (
                      <span
                        className={`font-mono text-xs tabular-nums ${
                          isActive ? 'text-emerald-300' : 'text-slate-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavChange?.(item.id);
                    closeDrawer?.();
                  }}
                  className={classes}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && Number(item.badge) > 0 ? (
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        isActive ? 'text-emerald-300' : 'text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="px-3 text-xs font-medium text-slate-400">
            Marketplace
          </p>
          <div className="mt-2 space-y-1">
            <Link
              to="/drivers"
              onClick={() => closeDrawer?.()}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-[#F5F6F8] hover:text-[#111315]"
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>Browse Drivers</span>
            </Link>
            <Link
              to="/cars"
              onClick={() => closeDrawer?.()}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-[#F5F6F8] hover:text-[#111315]"
            >
              <Car className="h-4 w-4 shrink-0" />
              <span>Browse Vehicles</span>
            </Link>
            <Link
              to="/book"
              onClick={() => closeDrawer?.()}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-[#F5F6F8] hover:text-[#111315]"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>New Booking</span>
            </Link>
            {user && user.role !== 'ADMIN' ? (
              <Link
                to="/onboarding"
                onClick={() => closeDrawer?.()}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-[#F5F6F8] hover:text-[#111315]"
              >
                <Compass className="h-4 w-4 shrink-0" />
                <span>Onboarding Guide</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F6F8] text-[#111315]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <Link
            to="/"
            className="font-display text-xl font-extrabold tracking-tight text-[#111315] whitespace-nowrap"
          >
            ProDrivers
          </Link>
        </div>
        {renderNavList()}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="font-display text-lg font-extrabold tracking-tight text-[#111315]"
              >
                ProDrivers
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-[#F5F6F8] cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNavList(() => setMobileMenuOpen(false))}
          </aside>
        </div>
      ) : null}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:h-16 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-700 hover:bg-[#F5F6F8] lg:hidden cursor-pointer"
              aria-label="Open workspace navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
              <Link
                to={dashboardHome}
                className="hidden truncate hover:text-[#111315] sm:inline"
              >
                {workspaceLabel}
              </Link>
              <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 sm:inline" />
              <span className="truncate font-semibold text-[#111315]">
                {sectionLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {primaryAction ? (
              <div className="hidden sm:block shrink-0">{primaryAction}</div>
            ) : null}

            {/* Notifications Popover */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setProfileOpen(false);
                  if (!notifOpen) loadNotifications();
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-[#F5F6F8] cursor-pointer"
                aria-label="View notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#32BB78] px-1 font-mono text-[10px] font-bold text-[#111315] tabular-nums">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </button>

              {notifOpen ? (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <span className="text-xs font-semibold text-[#111315]">
                      Notifications ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 ? (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Mark all read</span>
                      </button>
                    ) : null}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {loadingNotifs && notifications.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No notifications yet. Booking updates and payment confirmations appear here.
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleNotificationClick(n)}
                          className={`block w-full px-4 py-3 text-left transition-colors hover:bg-[#F5F6F8] cursor-pointer ${
                            !n.isRead ? 'bg-emerald-50/40' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#111315]">
                              {n.title}
                            </span>
                            {!n.isRead ? (
                              <span className="text-[11px] font-medium text-emerald-700">
                                New
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                            {formatDateTimeFull(n.createdAt)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Account Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((prev) => !prev);
                  setNotifOpen(false);
                }}
                className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white pl-1.5 pr-3 text-left hover:bg-[#F5F6F8] cursor-pointer"
                aria-label="Open account menu"
              >
                {user?.avatarUrl ? (
                  <SafeImage
                    src={user.avatarUrl}
                    alt={user.fullName}
                    fallbackType="driver"
                    className="h-7 w-7 rounded-full object-cover object-top"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111315] text-xs font-semibold text-white">
                    {initials}
                  </span>
                )}
                <span className="hidden max-w-[120px] truncate text-xs font-medium text-[#111315] md:inline">
                  {user?.fullName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>

              {profileOpen ? (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white py-2 shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="truncate text-sm font-semibold text-[#111315]">
                      {user?.fullName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {ROLE_LABELS[user?.role || 'CUSTOMER']} · {user?.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      to={dashboardHome}
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-[#F5F6F8]"
                    >
                      Dashboard Overview
                    </Link>
                    {user && user.role !== 'ADMIN' ? (
                      <Link
                        to="/onboarding"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-[#F5F6F8]"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Setup Checklist</span>
                      </Link>
                    ) : null}
                    <Link
                      to="/"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-[#F5F6F8]"
                    >
                      Public Marketplace
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-[#111315] sm:text-3xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
                ) : null}
              </div>
              {primaryAction ? (
                <div className="sm:hidden">{primaryAction}</div>
              ) : null}
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
