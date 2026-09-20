"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch, downloadFile } from "@/lib/api";
import { useAuthed } from "@/lib/useAuthed";
import type { Guest } from "@/lib/types";

const EMPTY = { name: "", passes: 2, phone: "", groupLabel: "" };

export default function GuestsPage() {
  const load = useCallback(() => apiFetch<Guest[]>("/api/admin/guests"), []);
  const { data, error, loading, reload, setError } = useAuthed(load);
  const [form, setForm] = useState(EMPTY);
  const [copied, setCopied] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await apiFetch("/api/admin/guests", {
        method: "POST",
        body: JSON.stringify(form),
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
    const phone = guest.phone.replace(/\D/g, "");
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
            className="rounded-full bg-[var(--event-primary)] px-4 py-2 text-white"
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
        <input
          type="number"
          min={1}
          value={form.passes}
          onChange={(e) => setForm({ ...form, passes: Number(e.target.value) })}
          placeholder="Pases"
          className="rounded-md border border-black/15 px-3 py-2"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="WhatsApp"
          className="rounded-md border border-black/15 px-3 py-2"
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
                <td className="py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyLink(guest)}
                      className="rounded border border-black/15 px-2 py-1 text-xs"
                    >
                      {copied === guest.id ? "¡Copiado!" : "Copiar"}
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
    </>
  );
}
