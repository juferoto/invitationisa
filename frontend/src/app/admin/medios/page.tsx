"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthed } from "@/lib/useAuthed";
import type { Media } from "@/lib/types";

const SECTIONS = [
  { value: "cover", label: "Portada del sobre" },
  { value: "hero", label: "Foto de apertura" },
  { value: "gallery", label: "Galería" },
  { value: "music", label: "Música de fondo" },
  { value: "video", label: "Video" },
];

export default function MediaPage() {
  const load = useCallback(() => apiFetch<Media[]>("/api/admin/media"), []);
  const { data, error, loading, reload, setError } = useAuthed(load);
  const [section, setSection] = useState("gallery");
  const [uploading, setUploading] = useState(false);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      // Subimos de a uno: así un archivo pesado que falle no tumba al resto.
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        body.append("section", section);
        await apiFetch("/api/admin/media", { method: "POST", body });
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function remove(item: Media) {
    if (!confirm("¿Eliminar este archivo?")) return;
    await apiFetch(`/api/admin/media/${item.id}`, { method: "DELETE" });
    await reload();
  }

  return (
    <>
      <h1 className="font-display text-3xl text-[var(--event-primary)]">
        Medios
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Fotos, música y video. Los archivos se guardan en el almacenamiento de
        objetos; la base solo conserva la referencia.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 text-sm"
        >
          {SECTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <label className="cursor-pointer rounded-full bg-[var(--event-primary)] px-5 py-2 text-sm text-white">
          {uploading ? "Subiendo…" : "Subir archivos"}
          <input
            type="file"
            multiple
            accept="image/*,audio/*,video/*"
            onChange={upload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-6 text-[var(--color-muted)]">Cargando…</p>}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(data ?? []).map((item) => (
          <figure
            key={item.id}
            className="rounded-lg border border-black/10 p-2"
          >
            {item.kind === "image" && (
              <div className="relative aspect-square overflow-hidden rounded">
                <Image
                  src={item.url}
                  alt={item.caption}
                  fill
                  sizes="25vw"
                  className="object-cover"
                />
              </div>
            )}
            {item.kind === "audio" && (
              <audio src={item.url} controls className="w-full" />
            )}
            {item.kind === "video" && (
              <video src={item.url} controls className="w-full rounded" />
            )}
            <figcaption className="mt-2 flex items-center justify-between text-xs text-[var(--color-muted)]">
              <span>{item.section}</span>
              <button onClick={() => remove(item)} className="text-red-600">
                Eliminar
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
