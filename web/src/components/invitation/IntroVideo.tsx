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
 * Video de entrada a pantalla completa. Se reproduce solo, cubre todo y al
 * terminar se desvanece para dejar ver la portada del sobre.
 *
 * Se intenta primero con sonido. Los navegadores solo dejan arrancar así
 * cuando el invitado ya ha interactuado con el sitio, de modo que al ser
 * rechazado se repite en silencio —eso siempre lo aceptan— y se ofrece un
 * botón para activarlo, que sí es un gesto del usuario.
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
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!src) return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    video.muted = false;
    video.play().then(
      () => {
        if (!cancelled) setMuted(false);
      },
      () => {
        if (cancelled) return;
        video.muted = true;
        setMuted(true);
        // Si el navegador rechaza incluso el video silenciado, no dejamos al
        // invitado mirando un cuadro negro: se pasa directo a la portada.
        video.play().catch(() => setFinished(true));
      },
    );

    return () => {
      cancelled = true;
    };
  }, [src]);

  // Mientras el video ocupa la pantalla no queremos scroll detrás.
  useEffect(() => {
    if (finished) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [finished]);

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
    // Quitar el silencio dentro de un gesto también autoriza la reproducción,
    // por si el video se había quedado en pausa.
    if (!next) void video.play().catch(() => {});
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

            <div className="absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-10 flex items-center justify-between px-6">
              <button
                onClick={toggleSound}
                aria-label={muted ? "Activar el sonido" : "Silenciar el video"}
                className="flex items-center gap-2 rounded-full border border-white/40 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.1em] text-white backdrop-blur"
              >
                <SpeakerIcon muted={muted} />
                {/* Con el sonido puesto basta el icono; apagado conviene
                    decirlo, que es lo que el invitado querrá tocar. */}
                {muted && "Sonido"}
              </button>

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
