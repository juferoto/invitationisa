"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { eventTime } from "@/lib/eventTime";
import { useNow } from "@/lib/useNow";
import type { Rsvp } from "@/lib/types";

export default function RsvpForm({
  token,
  guestName,
  passes,
  initial,
  deadline,
}: {
  token: string;
  guestName: string;
  passes: number;
  initial: Rsvp | null;
  deadline: string;
}) {
  const [rsvp, setRsvp] = useState<Rsvp | null>(initial);
  const [attending, setAttending] = useState(initial?.attendingCount ?? passes);
  const [message, setMessage] = useState(initial?.message ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // En el servidor `now` es null: damos el plazo por abierto para que el HTML
  // inicial coincida con la hidratación y no parpadee.
  const now = useNow();
  // El límite se mide en la hora del lugar de la fiesta, igual que en el
  // servidor: si aquí se usara el huso del invitado, la página y la API no
  // dirían lo mismo.
  const limite = eventTime(deadline);
  const closed = !Number.isNaN(limite) && now !== null && limite / 1000 < now;

  async function send(status: "confirmed" | "declined") {
    setSending(true);
    setError("");
    try {
      const res = await fetch(
        `${API_URL}/api/public/invitation/${token}/rsvp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            attendingCount: status === "confirmed" ? attending : 0,
            message,
          }),
        },
      );
      if (!res.ok) {
        // El servidor explica el motivo —por ejemplo que el plazo venció
        // mientras la página estaba abierta—, y eso le sirve más al invitado
        // que un «no se pudo» a secas.
        const cuerpo = await res.json().catch(() => null);
        throw new Error(
          (cuerpo as { error?: string } | null)?.error ??
            "No se pudo registrar tu respuesta",
        );
      }
      setRsvp((await res.json()) as Rsvp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSending(false);
    }
  }

  if (closed && !rsvp) {
    return (
      <p className="text-center text-[var(--color-muted)]">
        El plazo para confirmar ya se cerró. Escríbenos directamente si aún
        quieres acompañarnos.
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {rsvp && (
        <div className="card mb-6 p-5 text-center">
          {rsvp.status === "confirmed" ? (
            <p>
              ¡Gracias, {guestName}! Te esperamos con{" "}
              <span className="tracking-[0.1em] text-[var(--event-primary)]">
                {rsvp.attendingCount}{" "}
                {rsvp.attendingCount === 1 ? "pase" : "pases"}
              </span>
              .
            </p>
          ) : (
            <p>Lamentamos que no puedas acompañarnos. ¡Gracias por avisar!</p>
          )}
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {closed
              ? "El plazo para cambiar tu respuesta ya se cerró. Escríbenos directamente si algo cambia."
              : "Puedes cambiar tu respuesta abajo si algo se modifica."}
          </p>
        </div>
      )}

      {/* Pasado el plazo se retira el formulario y queda solo la respuesta ya
          dada: el servidor rechazaría cualquier cambio, y ofrecer botones que
          van a fallar es peor que no ofrecerlos. */}
      {closed ? null : (
        <>
          <label className="block text-sm text-[var(--color-muted)]">
            ¿Cuántas personas asisten? (tienes {passes}{" "}
            {passes === 1 ? "pase" : "pases"})
          </label>
          <input
            type="number"
            min={1}
            max={passes}
            value={attending}
            onChange={(e) => setAttending(Number(e.target.value))}
            className="mt-2 w-full rounded-[10px] border border-[var(--event-primary)]/25 bg-white px-4 py-3 text-center text-lg"
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Un mensaje para la quinceañera (opcional)"
            className="mt-4 w-full rounded-[10px] border border-[var(--event-primary)]/25 bg-white px-4 py-3"
          />

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => send("confirmed")}
              disabled={sending}
              className="pill flex-1 bg-[var(--event-primary)] px-6 py-3.5 text-sm tracking-[0.05em] text-white shadow-lg disabled:opacity-50"
            >
              {sending ? "Enviando…" : "Confirmar asistencia"}
            </button>
            <button
              onClick={() => send("declined")}
              disabled={sending}
              className="pill flex-1 border border-[var(--event-primary)]/40 px-6 py-3.5 text-sm tracking-[0.05em] text-[var(--event-primary)] disabled:opacity-50"
            >
              No podré asistir
            </button>
          </div>
        </>
      )}
    </div>
  );
}
