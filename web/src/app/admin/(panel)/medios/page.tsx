"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthed } from "@/lib/useAuthed";
import type { Media } from "@/lib/types";

/**
 * Cada bloque explica dónde aparece el archivo en la invitación y qué formato
 * espera, para no tener que adivinar con un desplegable suelto.
 */
const SECTIONS = [
  {
    value: "cover",
    label: "Portada del sobre",
    help: "La foto que va detrás del sobre, antes de abrir la invitación. Vertical se ve mejor.",
    accept: "image/*",
    single: true,
  },
  {
    value: "hero",
    label: "Foto de apertura",
    help: "La primera foto al abrir el sobre. Se muestra completa, sin recortar: súbela ya redimensionada, idealmente bajo 1600px de ancho.",
    accept: "image/*",
    single: true,
  },
  {
    value: "gallery",
    label: "Galería de fotos",
    help: "El carrusel de la sección «Celebrando mis 15 años». Puedes subir varias a la vez.",
    accept: "image/*",
    single: false,
  },
  {
    value: "dresscode",
    label: "Ilustración del código de vestuario",
    help: "Va al centro de esa sección, entre lo que visten mujeres y hombres. Se muestra completa, sin recortar.",
    accept: "image/*",
    single: true,
  },
  {
    value: "music",
    label: "Música de fondo",
    help: "Suena al abrir el sobre y se repite. Un MP3 de 128 kbps basta y pesa la mitad que uno de 256.",
    accept: "audio/*",
    single: true,
  },
  {
    value: "video",
    label: "Video de entrada",
    help: "Se reproduce a pantalla completa antes de mostrar el sobre y se desvanece al terminar. Arranca solo; si el navegador no permite el sonido automático, empieza en silencio y el invitado lo activa tocando la pantalla. Comprímelo antes de subirlo: es el archivo que más pesa de toda la invitación. Déjalo vacío si no quieres video.",
    accept: "video/*",
    single: true,
  },
] as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPage() {
  const load = useCallback(() => apiFetch<Media[]>("/api/admin/media"), []);
  const { data, error, loading, reload, setError } = useAuthed(load);
  const [uploading, setUploading] = useState("");

  async function upload(section: string, files: File[]) {
    if (files.length === 0) return;
    setUploading(section);
    setError("");
    try {
      // De a uno: así un archivo pesado que falle no tumba al resto.
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
      setUploading("");
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
        Los archivos se guardan en el almacenamiento de objetos; la base de
        datos solo conserva la referencia.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-6 text-[var(--color-muted)]">Cargando…</p>}

      {SECTIONS.map((section) => {
        const items = (data ?? []).filter((m) => m.section === section.value);
        return (
          <section
            key={section.value}
            className="mt-10 border-t border-black/10 pt-8 first:border-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <h2 className="font-display text-2xl">{section.label}</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {section.help}
                </p>
              </div>
              <label className="cursor-pointer whitespace-nowrap rounded-full bg-[var(--event-primary)] px-5 py-2 text-sm text-white">
                {uploading === section.value
                  ? "Subiendo…"
                  : items.length > 0 && section.single
                    ? "Reemplazar"
                    : "Subir"}
                <input
                  type="file"
                  multiple={!section.single}
                  accept={section.accept}
                  onChange={(e) => {
                    void upload(
                      section.value,
                      Array.from(e.target.files ?? []),
                    );
                    e.target.value = "";
                  }}
                  disabled={uploading !== ""}
                  className="hidden"
                />
              </label>
            </div>

            {/* Subir a una sección de un solo archivo reemplaza el anterior,
                así que esto ya no debería pasar. Se deja como red: si el
                borrado del viejo falló, conviene saberlo, porque el que se ve
                es el primero de la lista y no el recién subido. */}
            {section.single && items.length > 1 && (
              <p className="mt-3 text-sm text-amber-700">
                Quedaron {items.length} archivos aquí y la invitación solo
                muestra el primero. Elimina los que sobren.
              </p>
            )}

            {items.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--color-muted)]">
                Todavía no hay nada.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {items.map((item) => (
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
                      <video
                        src={item.url}
                        controls
                        className="w-full rounded"
                      />
                    )}
                    <figcaption className="mt-2 flex items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
                      <span>{formatBytes(item.sizeBytes)}</span>
                      <button
                        onClick={() => remove(item)}
                        className="text-red-600"
                      >
                        Eliminar
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
