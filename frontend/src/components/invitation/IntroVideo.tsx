"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Video de entrada a pantalla completa. Se reproduce solo, cubre todo y al
 * terminar se desvanece para dejar ver la portada del sobre.
 *
 * Va silenciado a propósito: los navegadores bloquean la reproducción
 * automática con sonido, así que un video con audio simplemente no arrancaría.
 * La música empieza después, al abrir el sobre, que sí es un gesto del usuario.
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

  useEffect(() => {
    if (!src) return;
    const video = videoRef.current;
    if (!video) return;

    // Si el navegador rechaza la reproducción, no dejamos al invitado
    // mirando un cuadro negro: se pasa directo a la portada.
    video.play().catch(() => setFinished(true));
  }, [src]);

  // Mientras el video ocupa la pantalla no queremos scroll detrás.
  useEffect(() => {
    if (finished) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [finished]);

  return (
    <>
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
              muted
              playsInline
              autoPlay
              preload="auto"
              onEnded={() => setFinished(true)}
              onError={() => setFinished(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />

            {/* Salida siempre disponible: si el video es largo, falla el
                evento de fin o el invitado ya lo vio, no queda atrapado. */}
            <button
              onClick={() => setFinished(true)}
              // El botón se aparta de la barra inferior del iPhone.
              className="absolute right-6 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-10 rounded-full border border-white/40 bg-black/30 px-5 py-2 text-xs uppercase tracking-[0.1em] text-white backdrop-blur"
            >
              Saltar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
