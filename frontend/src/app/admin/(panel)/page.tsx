"use client";

import { useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthed } from "@/lib/useAuthed";
import type { Summary } from "@/lib/types";

const CARDS: { key: keyof Summary; label: string; hint: string }[] = [
  { key: "guests", label: "Invitaciones", hint: "enviadas en total" },
  { key: "totalPasses", label: "Pases", hint: "asignados" },
  { key: "attendingSeats", label: "Asistentes", hint: "confirmados" },
  { key: "confirmed", label: "Confirmaron", hint: "invitaciones" },
  { key: "declined", label: "No asisten", hint: "invitaciones" },
  { key: "pending", label: "Sin responder", hint: "invitaciones" },
  { key: "opened", label: "Abrieron el link", hint: "invitaciones" },
];

export default function DashboardPage() {
  const load = useCallback(() => apiFetch<Summary>("/api/admin/summary"), []);
  const { data, error, loading } = useAuthed(load);

  if (loading) return <p className="text-[var(--color-muted)]">Cargando…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <>
      <h1 className="font-display text-3xl text-[var(--event-primary)]">
        Resumen
      </h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {CARDS.map((card) => (
          <div key={card.key} className="rounded-lg border border-black/10 p-5">
            <div className="font-display text-4xl text-[var(--event-primary)]">
              {data[card.key]}
            </div>
            <div className="mt-1 text-sm font-medium">{card.label}</div>
            <div className="text-xs text-[var(--color-muted)]">{card.hint}</div>
          </div>
        ))}
      </div>
    </>
  );
}
