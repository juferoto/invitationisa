"use client";

import { useCallback, useRef, useState } from "react";
import QrDialog from "@/components/admin/QrDialog";
import PhoneField, {
  DEFAULT_COUNTRY,
  fullPhone,
} from "@/components/admin/PhoneField";
import { apiFetch, downloadFile } from "@/lib/api";
import { useAuthed } from "@/lib/useAuthed";
import type { Guest } from "@/lib/types";

/**
 * `passes` vacío a propósito: un 2 por defecto se cuela tal cual en las
 * invitaciones que nadie revisa. Vacío obliga a escribir el número, y el
 * texto del campo dice cuál es.
 */
const EMPTY = {
  name: "",
  passes: "",
  phone: "",
  groupLabel: "",
  country: DEFAULT_COUNTRY,
};

export default function GuestsPage() {
  const load = useCallback(() => apiFetch<Guest[]>("/api/admin/guests"), []);
  const { data, error, loading, reload, setError } = useAuthed(load);
  const [form, setForm] = useState(EMPTY);
  const [copied, setCopied] = useState<number | null>(null);
  const [qrGuest, setQrGuest] = useState<Guest | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      const { country, ...resto } = form;
      await apiFetch("/api/admin/guests", {
        method: "POST",
        body: JSON.stringify({
          ...resto,
          // Sin número escrito, un pase: es lo mínimo con sentido para una
          // invitación.
          passes: Number(form.passes) || 1,
          phone: fullPhone(country, form.phone),
        }),
      });
      setForm(EMPTY);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    }
  }

  async function remove(guest: Guest) {
    if (!confirm(`¿Eliminar a ${guest.name}? Su link dejará de funcionar.`))
      return;
    await apiFetch(`/api/admin/guests/${guest.id}`, { method: "DELETE" });
    await reload();
  }

  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await apiFetch<{ created: number }>(
        "/api/admin/guests/import",
        {
          method: "POST",
          body,
        },
      );
      alert(`${res.created} invitados importados`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function exportCsv(status: string) {
    try {
      const query = status ? `?status=${status}` : "";
      await downloadFile(`/api/admin/guests/export${query}`, "invitados.csv");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar");
    }
  }

  async function copyLink(guest: Guest) {
    await navigator.clipboard.writeText(guest.link);
    setCopied(guest.id);
    setTimeout(() => setCopied(null), 1500);
  }

  function whatsappLink(guest: Guest) {
    const text = `¡Hola ${guest.name}! Te compartimos la invitación: ${guest.link}`;
    let phone = guest.phone.replace(/\D/g, "");
    // Puente para los guardados antes del selector de país: `wa.me` necesita
    // el indicativo y sin él no abre ninguna conversación. Diez dígitos es un
    // móvil colombiano; cualquier otra longitud se deja como está, que es
    // menos arriesgado que adivinar.
    if (!guest.phone.startsWith("+") && phone.length === 10) {
      phone = `57${phone}`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-[var(--event-primary)]">
          Invitados
        </h1>
        <div className="flex gap-3 text-sm">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-black/15 px-4 py-2"
          >
            Importar CSV
          </button>
          <button
            onClick={() => exportCsv("confirmed")}
            className="rounded-full border border-black/15 px-4 py-2"
          >
            Exportar confirmados
          </button>
          <button
            onClick={() => exportCsv("")}
            className="rounded-full border border-black/15 px-4 py-2"
          >
            Exportar todos
          </button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        onChange={importCsv}
        className="hidden"
      />
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        Formato del CSV: nombre, pases, teléfono, correo, grupo (una fila por
        invitación).
      </p>

      <form onSubmit={create} className="mt-6 grid gap-3 sm:grid-cols-5">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nombre o familia"
          className="rounded-md border border-black/15 px-3 py-2 sm:col-span-2"
        />
        {/* `inputMode` es lo que saca el teclado numérico en el móvil; con
            `type="number"` el teclado trae además signos y letras. El filtro
            del onChange garantiza que solo entren dígitos. */}
        <input
          value={form.passes}
          onChange={(e) =>
            setForm({ ...form, passes: e.target.value.replace(/\D/g, "") })
          }
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Número de invitados"
          aria-label="Número de invitados"
          className="rounded-md border border-black/15 px-3 py-2"
        />
        <PhoneField
          country={form.country}
          number={form.phone}
          onCountry={(country) => setForm({ ...form, country })}
          onNumber={(phone) => setForm({ ...form, phone })}
        />
        <button className="rounded-md bg-[var(--event-primary)] px-4 py-2 text-sm text-white">
          Agregar
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-6 text-[var(--color-muted)]">Cargando…</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <tr>
              <th className="py-2">Invitado</th>
              <th className="py-2">Pases</th>
              <th className="py-2">Respuesta</th>
              <th className="py-2">Aperturas</th>
              <th className="py-2">Link</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((guest) => (
              <tr key={guest.id} className="border-b border-black/5">
                <td className="py-3">
                  <div className="font-medium">{guest.name}</div>
                  {guest.groupLabel && (
                    <div className="text-xs text-[var(--color-muted)]">
                      {guest.groupLabel}
                    </div>
                  )}
                </td>
                <td className="py-3">{guest.passes}</td>
                <td className="py-3">
                  {guest.rsvp ? (
                    guest.rsvp.status === "confirmed" ? (
                      <span className="text-green-700">
                        Asisten {guest.rsvp.attendingCount}
                      </span>
                    ) : (
                      <span className="text-[var(--color-muted)]">
                        No asiste
                      </span>
                    )
                  ) : (
                    <span className="text-amber-700">Pendiente</span>
                  )}
                </td>
                {/* Un link abierto muchas más veces que pases asignados es
                    señal de que se reenvió: no dice quién lo vio, pero sí que
                    el consumo de ese link se multiplicó. */}
                <td className="py-3">
                  {guest.views === 0 ? (
                    <span className="text-[var(--color-muted)]">—</span>
                  ) : (
                    <span
                      className={
                        guest.views > guest.passes * 4
                          ? "text-amber-700"
                          : undefined
                      }
                      title={
                        guest.views > guest.passes * 4
                          ? "Muchas más aperturas que pases: es probable que el link se haya compartido"
                          : undefined
                      }
                    >
                      {guest.views}
                    </span>
                  )}
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyLink(guest)}
                      className="rounded border border-black/15 px-2 py-1 text-xs"
                    >
                      {copied === guest.id ? "¡Copiado!" : "Copiar"}
                    </button>
                    <button
                      onClick={() => setQrGuest(guest)}
                      className="rounded border border-black/15 px-2 py-1 text-xs"
                    >
                      QR
                    </button>
                    {guest.phone && (
                      <a
                        href={whatsappLink(guest)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-black/15 px-2 py-1 text-xs"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => remove(guest)}
                    className="text-xs text-red-600"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {qrGuest && <QrDialog guest={qrGuest} onClose={() => setQrGuest(null)} />}
    </>
  );
}
