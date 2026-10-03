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
  // Se guarda como texto para no pelear con quien está escribiendo: un número
  // a medio teclear puede quedar vacío un instante, y forzarlo a 1 en ese
  // momento le borraría la cifra bajo los dedos.
  const [attending, setAttending] = useState(
    String(initial?.attendingCount ?? passes),
  );
  const [message, setMessage] = useState(initial?.message ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Una invitación de un solo pase no tiene nada que elegir.
  const onlyOne = passes <= 1;

  /** Deja el número dentro de lo que permite la invitación. */
  function clamp(value: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(Math.trunc(n), passes);
  }

  /**
   * Lo que se admite en el campo mientras se escribe: nada por debajo de uno
   * ni por encima de los pases de la invitación.
   *
   * Los ceros a la izquierda se descartan en vez de corregirse después. Con
   * solo mirar el tope, un cero lo pasaba —cero es menor que cualquier número
   * de pases— y se podían encadenar «000» hasta salir del campo. Quitarlos
   * aquí hace que teclear un cero simplemente no escriba nada.
   *
   * El vacío se conserva: hace falta para poder borrar la cifra y escribir
   * otra, y al salir del campo se normaliza a uno.
   */
  function nextAttending(raw: string) {
    const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
    if (digits === "") return "";
    return Number(digits) <= passes ? digits : String(passes);
  }

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
            attendingCount: status === "confirmed" ? clamp(attending) : 0,
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

  const confirmado = rsvp?.status === "confirmed";

  return (
    <div className="mx-auto w-full max-w-md">
      {rsvp && (
        // Confirmado se marca en ámbar y con borde grueso: el invitado que
        // vuelve a abrir la invitación tiene que ver de un vistazo que su
        // respuesta ya está dada, sin leer nada.
        <div
          className={
            confirmado
              ? "mb-6 rounded-[15px] border-2 border-amber-400 bg-amber-50 p-5 text-center text-amber-950"
              : "card mb-6 p-5 text-center"
          }
        >
          {confirmado ? (
            <p>
              <span className="font-medium">¡Gracias, {guestName}!</span> Tu
              asistencia está confirmada para{" "}
              <span className="font-medium tracking-[0.1em]">
                {rsvp.attendingCount}{" "}
                {rsvp.attendingCount === 1 ? "persona" : "personas"}
              </span>
              .
            </p>
          ) : (
            <p>Lamentamos que no puedas acompañarnos. ¡Gracias por avisar!</p>
          )}
          <p
            className={`mt-2 text-xs ${confirmado ? "text-amber-800" : "text-[var(--color-muted)]"}`}
          >
            {closed
              ? "El plazo para cambiar tu respuesta ya se cerró. Escríbenos directamente si algo cambia."
              : "Si algo cambia puedes modificarla abajo, incluso avisar de que al final no podrás venir."}
          </p>
        </div>
      )}

      {/* Pasado el plazo se retira el formulario y queda solo la respuesta ya
          dada: el servidor rechazaría cualquier cambio, y ofrecer botones que
          van a fallar es peor que no ofrecerlos. */}
      {closed ? null : (
        <>
          <label
            htmlFor="asistentes"
            className="block text-sm text-[var(--color-muted)]"
          >
            ¿Cuántas personas asisten? (tienes {passes}{" "}
            {passes === 1 ? "pase" : "pases"})
          </label>
          <input
            id="asistentes"
            // `inputMode` saca el teclado numérico en el móvil sin los signos
            // que trae `type="number"`. Los límites se aplican según se
            // escribe, así el invitado ve al momento qué puede poner.
            inputMode="numeric"
            pattern="[0-9]*"
            value={attending}
            disabled={onlyOne}
            onChange={(e) => setAttending(nextAttending(e.target.value))}
            // Al salir del campo se normaliza lo que quedó a medias: vacío o
            // cero pasan a uno.
            onBlur={() => setAttending(String(clamp(attending)))}
            className="mt-2 w-full rounded-[10px] border border-[var(--event-primary)]/25 bg-white px-4 py-3 text-center text-lg disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-[var(--color-muted)]"
          />
          {onlyOne && (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Tu invitación es para una persona.
            </p>
          )}

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
              {sending
                ? "Enviando…"
                : confirmado
                  ? "Actualizar confirmación"
                  : "Confirmar asistencia"}
            </button>
            {/* Sigue disponible después de confirmar, hasta que venza el
                plazo: quien se arrepiente tiene que poder avisar por aquí en
                vez de tener que escribir aparte. */}
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
