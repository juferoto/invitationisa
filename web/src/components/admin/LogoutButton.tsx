"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Cierra la sesión del panel. La sesión dura una hora; pasado ese plazo el
 * servidor responde 401 y hay que volver a entrar.
 */
export default function LogoutButton() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ email: string }>("/api/admin/me")
      .then((me) => {
        if (!cancelled) setEmail(me.email);
      })
      .catch(() => {
        // Sin sesión no hay nada que mostrar; las propias páginas del panel
        // se encargan de mandar al login.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** `all` cierra la sesión en todos los dispositivos, no solo en este. */
  async function logout(all = false) {
    if (all && !confirm("¿Cerrar la sesión en todos los dispositivos?")) return;
    setBusy(true);
    try {
      await apiFetch(all ? "/api/admin/logout-all" : "/api/admin/logout", {
        method: "POST",
      });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  if (!email) return null;

  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="hidden text-xs text-[var(--color-muted)] sm:inline">
        {email}
      </span>
      <button
        onClick={() => logout(false)}
        disabled={busy}
        className="rounded-full border border-black/15 px-4 py-1.5 text-xs disabled:opacity-50"
      >
        {busy ? "Saliendo…" : "Salir"}
      </button>
      <button
        onClick={() => logout(true)}
        disabled={busy}
        title="Úsalo si crees que alguien más tiene acceso a tu sesión"
        className="text-xs text-[var(--color-muted)] underline underline-offset-2 disabled:opacity-50"
      >
        Salir de todos los dispositivos
      </button>
    </div>
  );
}
