"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    // Sin barra de navegación: al no haber sesión no hay a dónde navegar.
    <form
      onSubmit={submit}
      className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5"
    >
      <h1 className="font-display text-3xl text-[var(--event-primary)]">
        Panel
      </h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Correo"
        autoComplete="username"
        className="mt-6 w-full rounded-md border border-black/15 px-4 py-3"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        autoComplete="current-password"
        className="mt-3 w-full rounded-md border border-black/15 px-4 py-3"
      />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        disabled={busy}
        className="mt-5 w-full rounded-full bg-[var(--event-primary)] px-6 py-3 text-sm text-white disabled:opacity-50"
      >
        {busy ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
