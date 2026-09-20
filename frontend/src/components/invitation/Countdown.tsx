"use client";

import { useNow } from "@/lib/useNow";

const LABELS = ["Días", "Horas", "Min", "Seg"] as const;

function split(remainingSeconds: number): number[] {
  const s = Math.max(0, remainingSeconds);
  return [
    Math.floor(s / 86400),
    Math.floor((s % 86400) / 3600),
    Math.floor((s % 3600) / 60),
    s % 60,
  ];
}

export default function Countdown({ eventDate }: { eventDate: string }) {
  const now = useNow();
  const target = Math.floor(new Date(eventDate).getTime() / 1000);

  if (Number.isNaN(target)) return null;

  const values = now === null ? null : split(target - now);

  return (
    <div
      className="grid grid-cols-4 gap-2 sm:gap-4"
      aria-label="Cuenta regresiva"
    >
      {LABELS.map((label, i) => (
        <div
          key={label}
          className="card px-2 py-4 text-center backdrop-blur sm:px-4 sm:py-6"
        >
          <div className="font-display text-4xl leading-none text-[var(--event-primary)] sm:text-6xl">
            {values ? String(values[i]).padStart(2, "0") : "--"}
          </div>
          <div className="mt-1 text-[0.6rem] uppercase tracking-[0.1em] text-[var(--color-muted)] sm:text-xs">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
