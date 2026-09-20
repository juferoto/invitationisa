"use client";

import { useCallback } from "react";
import EventForm, { type EventPayload } from "@/components/admin/EventForm";
import { apiFetch } from "@/lib/api";
import { useAuthed } from "@/lib/useAuthed";

export default function EventPage() {
  const load = useCallback(() => apiFetch<EventPayload>("/api/admin/event"), []);
  const { data, error, loading } = useAuthed(load);

  if (loading) return <p className="text-[var(--color-muted)]">Cargando…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;

  // La `key` recrea el formulario si llega otro evento, sin sincronizar estado.
  return <EventForm key={data.event.id} initial={data} />;
}
