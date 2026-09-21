"use client";

import { useEffect, useState } from "react";
import { API_URL, downloadFile } from "@/lib/api";
import type { Guest } from "@/lib/types";

/**
 * Muestra el enlace de un invitado como código QR, para compartirlo impreso o
 * en una imagen. El PNG lo genera el backend.
 */
export default function QrDialog({
  guest,
  onClose,
}: {
  guest: Guest;
  onClose: () => void;
}) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // La imagen va detrás de la cookie de sesión, así que se pide con fetch y se
  // muestra como blob; un <img src> directo no llevaría las credenciales.
  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    fetch(`${API_URL}/api/admin/guests/${guest.id}/qr`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo generar el código");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [guest.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function copyLink() {
    await navigator.clipboard.writeText(guest.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Código QR de ${guest.name}`}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl text-[var(--event-primary)]">
          {guest.name}
        </h2>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {guest.passes} {guest.passes === 1 ? "pase" : "pases"}
        </p>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
        {!error && !src && (
          <p className="mt-6 text-sm text-[var(--color-muted)]">Generando…</p>
        )}
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`Código QR con la invitación de ${guest.name}`}
            className="mx-auto mt-5 w-full max-w-[16rem] rounded-lg"
          />
        )}

        <p className="mt-4 text-xs break-all text-[var(--color-muted)]">
          {guest.link}
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
          <button
            onClick={() =>
              downloadFile(
                `/api/admin/guests/${guest.id}/qr`,
                `qr-${guest.id}.png`,
              )
            }
            disabled={!src}
            className="rounded-full bg-[var(--event-primary)] px-4 py-2 text-white disabled:opacity-40"
          >
            Descargar PNG
          </button>
          <button
            onClick={copyLink}
            className="rounded-full border border-black/15 px-4 py-2"
          >
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-black/15 px-4 py-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
