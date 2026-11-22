import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  AlertCircle,
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
      'bg-[#32BB78] text-[#111315] font-semibold hover:bg-[#29A86A] focus-visible:ring-[#32BB78]',
    secondary:
      'bg-[#111315] text-white font-semibold hover:bg-[#24282D] focus-visible:ring-[#111315]',
    outline:
      'border border-slate-300 bg-white text-[#111315] font-medium hover:bg-[#F5F6F8] focus-visible:ring-slate-400',
    ghost:
      'bg-transparent text-slate-700 font-medium hover:bg-[#F5F6F8] focus-visible:ring-slate-400',
    danger:
      'bg-red-600 text-white font-semibold hover:bg-red-700 focus-visible:ring-red-600',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-sm',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
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
        'rounded-2xl border border-slate-200/90 bg-white',
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
        'w-full rounded-xl border border-slate-200 bg-[#F5F6F8] px-3.5 py-2.5 text-sm text-[#111315] placeholder:text-slate-400 transition-colors focus:border-[#111315] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#32BB78]/25 disabled:opacity-60',
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
        'w-full rounded-xl border border-slate-200 bg-[#F5F6F8] px-3.5 py-2.5 text-sm text-[#111315] transition-colors focus:border-[#111315] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#32BB78]/25 disabled:opacity-60',
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
        'w-full rounded-xl border border-slate-200 bg-[#F5F6F8] px-3.5 py-2.5 text-sm text-[#111315] placeholder:text-slate-400 transition-colors focus:border-[#111315] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#32BB78]/25',
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
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>{formatStatus(s)}</span>
      </span>
    );
  }
  if (
    ['AWAITING_PAYMENT', 'PENDING', 'IN_PROGRESS', 'BUSY', 'OPEN'].includes(s)
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <Clock className="h-3.5 w-3.5 shrink-0" />
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
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{formatStatus(s)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
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
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#F5F6F8] px-6 py-12 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
      <h3 className="mt-3 font-display text-base font-semibold text-[#111315]">
        {title}
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
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
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackType?: 'car' | 'driver';
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-[#F5F6F8] text-slate-400',
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
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
