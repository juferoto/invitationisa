"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./api";

/**
 * Carga datos del CRM y manda al login si la sesión no sirve.
 * `reload` incrementa un contador que vuelve a disparar el efecto; así
 * ningún setState ocurre de forma síncrona dentro del efecto.
 */
export function useAuthed<T>(load: () => Promise<T>) {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await load();
        if (cancelled) return;
        setData(result);
        setError("");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/admin/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Error inesperado");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, version, router]);

  const reload = useCallback(async () => {
    setLoading(true);
    setVersion((v) => v + 1);
  }, []);

  return { data, error, loading, reload, setError };
}
