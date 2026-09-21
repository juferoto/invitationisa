import type { Invitation } from "./types";

/**
 * En el navegador, vacío: las llamadas van a rutas relativas y Next las
 * reenvía a la API (ver `rewrites` en next.config.ts). Así el navegador solo
 * habla con su propio dominio y la cookie de sesión es de primera parte, que
 * es lo que Safari en iOS exige.
 */
export const API_URL = "";

// En el servidor vamos directo a la API: un salto menos y sin el límite de
// tamaño del proxy.
const SERVER_API_URL = (
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // respuesta sin JSON: nos quedamos con el statusText
    }
    throw new ApiError(res.status, message);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Llamada desde el navegador al CRM: siempre con cookie de sesión. */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers:
      init.body instanceof FormData
        ? init.headers
        : { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  return unwrap<T>(res);
}

/** Carga de la invitación desde el servidor de Next (SSR). */
export async function getInvitation(token: string): Promise<Invitation | null> {
  const res = await fetch(
    `${SERVER_API_URL}/api/public/invitation/${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (res.status === 404) return null;
  return unwrap<Invitation>(res);
}

/**
 * Descarga un archivo del CRM. No usamos un <a href> directo porque la ruta
 * exige la cookie de sesión y, en producción, la API vive en otro origen.
 */
export async function downloadFile(path: string, fallbackName: string) {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw new ApiError(res.status, "No se pudo generar el archivo");

  // El nombre lo manda el servidor en Content-Disposition.
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = match?.[1] ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
