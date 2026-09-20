"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";

export default function SongForm({ token }: { token: string }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `${API_URL}/api/public/invitation/${token}/songs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, artist }),
        },
      );
      // 409 significa que esa canción ya estaba en la lista: no es un fallo,
      // así que se avisa en tono neutro y se limpia el formulario igual.
      if (res.status === 409) {
        const body = await res.json().catch(() => null);
        setTitle("");
        setArtist("");
        setNotice(body?.error ?? "Esa canción ya la sugirió alguien más.");
        return;
      }
      if (!res.ok) throw new Error("No se pudo enviar la sugerencia");
      setTitle("");
      setArtist("");
      setNotice("¡Anotada! Puedes sugerir otra.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Canción"
          className="flex-1 rounded-[10px] border border-[var(--event-primary)]/25 bg-white px-4 py-3"
        />
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artista"
          className="flex-1 rounded-[10px] border border-[var(--event-primary)]/25 bg-white px-4 py-3"
        />
      </div>
      <button className="pill mt-4 w-full border border-[var(--event-primary)]/40 px-6 py-3.5 text-sm tracking-[0.05em] text-[var(--event-primary)]">
        Sugerir canción
      </button>
      {notice && (
        <p className="mt-3 text-center text-sm text-[var(--color-muted)]">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      )}
    </form>
  );
}
