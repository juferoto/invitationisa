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

  async function logout() {
    setBusy(true);
    try {
      await apiFetch("/api/admin/logout", { method: "POST" });
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
        onClick={logout}
        disabled={busy}
        className="rounded-full border border-black/15 px-4 py-1.5 text-xs disabled:opacity-50"
      >
        {busy ? "Saliendo…" : "Salir"}
      </button>
    </div>
  );
}
