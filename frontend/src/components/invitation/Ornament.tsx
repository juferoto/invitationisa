/**
 * Filigrana que separa las secciones. La referencia usa PNG florales sueltos;
 * en SVG se adapta al color del evento y no pesa nada.
 */
export default function Ornament({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      className={`mx-auto h-5 w-44 text-[var(--event-accent)] sm:w-60 ${className}`}
      aria-hidden="true"
    >
      <path d="M8 12h78" />
      <path d="M154 12h78" />
      <path d="M100 12c6-7 14-7 20 0-6 7-14 7-20 0z" />
      <path d="M120 12c6-7 14-7 20 0-6 7-14 7-20 0z" />
      <circle cx="120" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <path d="M86 12c4-3 8-3 12 0-4 3-8 3-12 0z" />
      <path d="M142 12c4-3 8-3 12 0-4 3-8 3-12 0z" />
    </svg>
  );
}
