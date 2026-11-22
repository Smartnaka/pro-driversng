import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Car,
  CheckCircle2,
  Clock,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      'bg-[var(--pd-primary)] text-white font-semibold hover:bg-[var(--pd-primary-hover)] focus-visible:ring-[var(--pd-primary)]',
    secondary:
      'bg-[var(--pd-ink)] text-white font-semibold hover:bg-[#1E2622] focus-visible:ring-[var(--pd-ink)]',
    outline:
      'border border-[var(--pd-border-strong)] bg-[var(--pd-surface)] text-[var(--pd-ink)] font-semibold hover:bg-[var(--pd-surface-muted)] focus-visible:ring-[var(--pd-primary)]',
    ghost:
      'bg-transparent text-[var(--pd-ink-muted)] font-semibold hover:bg-[var(--pd-surface-muted)] hover:text-[var(--pd-ink)] focus-visible:ring-[var(--pd-primary)]',
    danger:
      'bg-[#B91C1C] text-white font-semibold hover:bg-[#991B1B] focus-visible:ring-[#B91C1C]',
  };

  const sizes = {
    sm: 'px-3.5 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-sm',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--pd-border)] bg-[var(--pd-surface)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface)] px-3.5 py-2.5 text-sm text-[var(--pd-ink)] placeholder:text-[var(--pd-ink-subtle)] transition-colors focus:border-[var(--pd-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--pd-primary)]/20 disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface)] px-3.5 py-2.5 text-sm text-[var(--pd-ink)] transition-colors focus:border-[var(--pd-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--pd-primary)]/20 disabled:opacity-60',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface)] px-3.5 py-2.5 text-sm text-[var(--pd-ink)] placeholder:text-[var(--pd-ink-subtle)] transition-colors focus:border-[var(--pd-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--pd-primary)]/20',
        className
      )}
      {...props}
    />
  );
}

export function StatusText({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (
    [
      'CONFIRMED',
      'COMPLETED',
      'VERIFIED',
      'APPROVED',
      'AVAILABLE',
      'PAID',
      'ACCEPTED',
    ].includes(s)
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        <span>{formatStatus(s)}</span>
      </span>
    );
  }
  if (
    ['AWAITING_PAYMENT', 'PENDING', 'IN_PROGRESS', 'BUSY', 'OPEN'].includes(s)
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 whitespace-nowrap">
        <Clock className="h-3 w-3 shrink-0" />
        <span>{formatStatus(s)}</span>
      </span>
    );
  }
  if (
    [
      'CANCELLED',
      'REJECTED',
      'FAILED',
      'OFFLINE',
      'MAINTENANCE',
      'REFUNDED',
    ].includes(s)
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-800 whitespace-nowrap">
        <XCircle className="h-3 w-3 shrink-0" />
        <span>{formatStatus(s)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pd-border)] bg-[var(--pd-surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--pd-ink-muted)] whitespace-nowrap">
      <ShieldAlert className="h-3 w-3 shrink-0" />
      <span>{formatStatus(s)}</span>
    </span>
  );
}

function formatStatus(s: string): string {
  return s
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--pd-border)] bg-[var(--pd-surface)] px-5 py-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--pd-primary-soft)] text-[var(--pd-primary)]">
        {icon || <Car className="h-5 w-5" />}
      </div>
      <h3 className="mt-3.5 font-display text-base font-bold text-[var(--pd-ink)]">
        {title}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--pd-ink-muted)]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function SafeImage({
  src,
  alt,
  className,
  fallbackType = 'car',
  loading = 'lazy',
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackType?: 'car' | 'driver';
  loading?: 'eager' | 'lazy';
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-[var(--pd-surface-muted)] text-[var(--pd-ink-subtle)]',
          className
        )}
        aria-label={alt}
      >
        {fallbackType === 'driver' ? (
          <User className="h-10 w-10 stroke-[1.5]" />
        ) : (
          <Car className="h-10 w-10 stroke-[1.5]" />
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
