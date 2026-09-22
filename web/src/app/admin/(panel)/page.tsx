"use client";

import { useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthed } from "@/lib/useAuthed";
import type { Summary } from "@/lib/types";

/**
 * Cuota mensual del plan gratuito de Cloudinary, en GB. Si algún día se cambia
 * de almacén o de plan, este es el único número que hay que tocar.
 */
const CUOTA_GB = 25;

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

      <ConsumoDelMes
        vistas={data.viewsThisMonth}
        bytes={data.mediaBytesThisMonth}
      />
    </>
  );
}

/**
 * Aviso de consumo del almacén de medios.
 *
 * La cuota se mide por meses naturales y el aviso del proveedor llega por
 * correo al 90%, que es tarde si nadie lo mira. Esto lo pone delante: cada
 * apertura descarga el video y la canción, así que basta multiplicar.
 *
 * Es una estimación por arriba: quien vuelve a abrir el link desde el mismo
 * teléfono no se descarga nada, porque los medios llevan caché de treinta
 * días, y aquí se cuenta igual.
 */
function ConsumoDelMes({ vistas, bytes }: { vistas: number; bytes: number }) {
  // Se muestra siempre, también con el contador a cero. Esconderla hasta que
  // hubiera consumo la hacía invisible justo cuando alguien va a buscarla.
  const gb = bytes / 1024 ** 3;
  const porcentaje = Math.min(100, (gb / CUOTA_GB) * 100);
  const apretado = porcentaje >= 70;

  return (
    <section className="mt-8 rounded-lg border border-black/10 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">Consumo de medios este mes</h2>
        <span
          className={apretado ? "text-amber-700" : "text-[var(--color-muted)]"}
        >
          {gb.toFixed(2)} GB de {CUOTA_GB} · {vistas} aperturas
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
        <div
          className={`h-full rounded-full ${apretado ? "bg-amber-500" : "bg-[var(--event-primary)]"}`}
          style={{ width: `${Math.max(porcentaje, 1)}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-[var(--color-muted)]">
        {vistas === 0
          ? "Todavía nadie ha abierto la invitación este mes. Aquí irá apareciendo cuánto se lleva consumido del almacén de medios."
          : apretado
            ? "Cerca del límite. Si se agota, las fotos y el video dejan de verse hasta el mes siguiente; no hay ningún cobro. Quitar el video desde Medios libera la mitad del consumo al instante."
            : "Cada apertura descarga el video y la canción. La cuenta es una estimación por arriba: quien vuelve a abrir la invitación desde el mismo teléfono ya no los descarga."}
      </p>
    </section>
  );
}
