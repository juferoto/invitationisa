"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

// getSnapshot tiene que devolver un valor estable entre llamadas del mismo
// render, así que redondeamos a segundos y lo cacheamos.
let cachedSeconds = 0;
function getSnapshot() {
  const seconds = Math.floor(Date.now() / 1000);
  if (seconds !== cachedSeconds) cachedSeconds = seconds;
  return cachedSeconds;
}

/**
 * Hora actual en segundos, o null mientras se renderiza en el servidor.
 * Devolver null en el servidor evita el error de hidratación: el reloj solo
 * empieza a correr en el navegador.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
