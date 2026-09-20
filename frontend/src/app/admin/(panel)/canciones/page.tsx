"use client";

import { useCallback } from "react";
import { apiFetch, downloadFile } from "@/lib/api";
import { useAuthed } from "@/lib/useAuthed";
import type { SongRequest } from "@/lib/types";

export default function SongsPage() {
  const load = useCallback(
    () => apiFetch<SongRequest[]>("/api/admin/songs"),
    [],
  );
  const { data, error, loading } = useAuthed(load);

  if (loading) return <p className="text-[var(--color-muted)]">Cargando…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const songs = data ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-[var(--event-primary)]">
          Canciones sugeridas
        </h1>
        <button
          onClick={() =>
            downloadFile("/api/admin/songs/export", "canciones.csv")
          }
          disabled={songs.length === 0}
          className="rounded-full bg-[var(--event-primary)] px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          Exportar CSV
        </button>
      </div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        La lista para pasarle al DJ.
      </p>
      <ul className="mt-6 divide-y divide-black/5">
        {songs.map((song) => (
          <li key={song.id} className="py-3">
            <span className="font-medium">{song.title}</span>
            {song.artist && (
              <span className="text-[var(--color-muted)]">
                {" "}
                — {song.artist}
              </span>
            )}
            {song.guestName && (
              <div className="text-xs text-[var(--color-muted)]">
                Sugerida por {song.guestName}
              </div>
            )}
          </li>
        ))}
      </ul>
      {songs.length === 0 && (
        <p className="mt-6 text-[var(--color-muted)]">
          Todavía no hay sugerencias.
        </p>
      )}
    </>
  );
}
