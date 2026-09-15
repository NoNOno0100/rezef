export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect x="5" y="6" width="22" height="20" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 12h22M5 20h22" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      <circle cx="9.5" cy="9" r="1.1" fill="currentColor" />
      <circle cx="9.5" cy="16" r="1.1" fill="currentColor" />
      <circle cx="9.5" cy="23" r="1.1" fill="currentColor" />
      <circle cx="22.5" cy="9" r="1.1" fill="currentColor" />
      <circle cx="22.5" cy="16" r="1.1" fill="currentColor" />
      <circle cx="22.5" cy="23" r="1.1" fill="currentColor" />
    </svg>
  );
}
