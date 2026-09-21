"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Indica si el video de entrada ya terminó. La portada lo consulta para
 * arrancar la música justo cuando aparece el sobre, sin pisar el audio del
 * video. Sin video el valor es `true` desde el primer render.
 */
const IntroFinishedContext = createContext(true);

export function useIntroFinished() {
  return useContext(IntroFinishedContext);
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
      {muted ? (
        <>
          <path d="m16.5 9.5 4 5" />
          <path d="m20.5 9.5-4 5" />
        </>
      ) : (
        <>
          <path d="M16 9.2a4 4 0 0 1 0 5.6" />
          <path d="M18.5 7a7.5 7.5 0 0 1 0 10" />
        </>
      )}
    </svg>
  );
}

/**
 * Video de entrada a pantalla completa. Cubre todo y al terminar se desvanece
 * para dejar ver la portada del sobre.
 *
 * Empieza solo, siempre. Lo intenta primero con sonido; ningún navegador lo
 * permite mientras el invitado no haya tocado la página, así que al rechazarlo
 * arranca en silencio —eso sí lo aceptan todos— y ofrece el sonido a un toque
 * en cualquier parte de la pantalla. Si aún va por los primeros segundos vuelve
 * al principio, para que el video se escuche entero.
 */
export default function IntroVideo({
  src,
  children,
}: {
  src?: string;
  children: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Sin video no hay nada que esperar: la portada se muestra de una vez.
  const [finished, setFinished] = useState(!src);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!src) return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    video.muted = false;
    video.play().catch(() => {
      // Rechazado por la política de reproducción automática. Lo que no se
      // puede es el sonido, no el video: en silencio arranca igual, y así el
      // invitado nunca se queda mirando un cuadro negro.
      if (cancelled) return;
      video.muted = true;
      setMuted(true);
      video.play().catch(() => setFinished(true));
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  /** Segundos dentro de los cuales quitar el silencio rebobina el video. */
  const REWIND_LIMIT = 6;

  function enableSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setMuted(false);
    // Si apenas empezó, se vuelve al principio para que no se pierda nada.
    // Más adelante no: devolver al invitado al inicio sería peor.
    if (video.currentTime < REWIND_LIMIT) video.currentTime = 0;
    void video.play().catch(() => {});
  }

  /**
   * En cuanto el invitado toca algo —donde sea, y valga para lo que valga—
   * el navegador concede el permiso que faltaba, así que el sonido entra sin
   * esperar a que encuentre el aviso. Solo está armado mientras el video va
   * en silencio.
   */
  useEffect(() => {
    if (!src || !muted || finished) return;
    const listeners = new AbortController();
    const options = { capture: true, signal: listeners.signal };
    const onActivation = () => {
      listeners.abort();
      enableSound();
    };
    document.addEventListener("pointerdown", onActivation, options);
    document.addEventListener("touchstart", onActivation, options);
    document.addEventListener("keydown", onActivation, options);
    return () => listeners.abort();
    // `enableSound` no entra: se recrea en cada render y volvería a armar los
    // oyentes sin necesidad.
  }, [src, muted, finished]);

  // Mientras el video ocupa la pantalla no queremos scroll detrás.
  useEffect(() => {
    if (finished) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [finished]);

  function muteSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    setMuted(true);
  }

  return (
    <IntroFinishedContext.Provider value={finished}>
      {children}

      <AnimatePresence>
        {!finished && src && (
          <motion.div
            // `100dvh` en vez de `inset-0` a secas: en el móvil la barra de
            // direcciones aparece y desaparece, y la altura del viewport fijo
            // deja franjas negras si no se sigue esa variación.
            className="fixed inset-0 z-[60] h-[100dvh] w-full overflow-hidden bg-black"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          >
            <video
              ref={videoRef}
              src={src}
              playsInline
              preload="auto"
              onEnded={() => setFinished(true)}
              onError={() => setFinished(true)}
              // `contain` y no `cover`: el video se ve completo dentro de la
              // pantalla en vez de ampliarse hasta llenarla y perder los
              // bordes. Lo que sobra queda en negro, que es el fondo.
              className="absolute inset-0 h-full w-full object-contain"
            />

            {/* Mientras va en silencio, toda la pantalla activa el sonido: el
                invitado no tiene que apuntar a un botón pequeño. El video ya
                se está viendo detrás, así que esto no tapa nada. */}
            {muted && (
              <button
                onClick={enableSound}
                aria-label="Activar el sonido"
                className="absolute inset-0 z-[5] flex items-start justify-center pt-[max(1.75rem,env(safe-area-inset-top))]"
              >
                <span className="flex items-center gap-2 rounded-full border border-white/40 bg-black/40 px-5 py-2 text-xs uppercase tracking-[0.15em] text-white backdrop-blur">
                  <SpeakerIcon muted />
                  Toca para escuchar
                </span>
              </button>
            )}

            <div className="absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-10 flex items-center justify-between px-6">
              {/* Con el sonido puesto, el único control que falta es callarlo.
                  En silencio manda el aviso de arriba, que es toda la pantalla. */}
              {muted ? (
                <span />
              ) : (
                <button
                  onClick={muteSound}
                  aria-label="Silenciar el video"
                  className="flex items-center gap-2 rounded-full border border-white/40 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.1em] text-white backdrop-blur"
                >
                  <SpeakerIcon muted={false} />
                </button>
              )}

              {/* Salida siempre disponible: si el video es largo, falla el
                  evento de fin o el invitado ya lo vio, no queda atrapado. */}
              <button
                onClick={() => setFinished(true)}
                className="rounded-full border border-white/40 bg-black/30 px-5 py-2 text-xs uppercase tracking-[0.1em] text-white backdrop-blur"
              >
                Saltar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </IntroFinishedContext.Provider>
  );
}
