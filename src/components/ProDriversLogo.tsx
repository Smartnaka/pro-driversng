interface ProDriversLogoProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function ProDriversLogo({
  className = '',
  size = 'md',
}: ProDriversLogoProps) {
  const iconSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const textSize = size === 'sm' ? 'text-lg' : 'text-xl';

  return (
    <span
      className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconSize} shrink-0`}
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="var(--pd-primary)" />
        {/* Stylized P + steering wheel arc */}
        <path
          d="M11 23V10.5H16.8C19.67 10.5 21.75 12.33 21.75 15C21.75 17.67 19.67 19.5 16.8 19.5H11"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16.5" cy="15" r="1.75" fill="#F59E0B" />
      </svg>
      <span
        className={`font-display ${textSize} font-extrabold tracking-tight text-[var(--pd-ink)]`}
      >
        ProDrivers
      </span>
    </span>
  );
}
