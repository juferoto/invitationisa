"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Media } from "@/lib/types";

// Variantes con nombre: `custom` solo llega a las funciones cuando la
// animación se declara así, no con objetos en línea.
const slide = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 80 : -80 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -80 : 80 }),
};

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

export default function Gallery({ photos }: { photos: Media[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState(1);
  // Guardamos dónde empezó el gesto para detectar el deslizamiento en el visor.
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // El carrusel usa scroll-snap nativo: el deslizamiento táctil, la inercia y
  // el frenado los resuelve el navegador mejor que cualquier cálculo a mano.
  const scrollTo = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  }, []);

  const step = useCallback(
    (delta: number) => {
      const next = (index + delta + photos.length) % photos.length;
      scrollTo(next);
    },
    [index, photos.length, scrollTo],
  );

  // La posición real la manda el scroll, no el estado: así el indicador sigue
  // siendo correcto cuando el invitado desliza con el dedo.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () =>
      setIndex(Math.round(track.scrollLeft / track.clientWidth));
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  const go = useCallback(
    (delta: number) => {
      setDirection(delta);
      setOpenIndex((i) =>
        i === null ? i : (i + delta + photos.length) % photos.length,
      );
    },
    [photos.length],
  );

  // En el visor: cerrar con Escape, navegar con flechas, sin scroll de fondo.
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, go]);

  if (photos.length === 0) return null;

  const current = openIndex === null ? null : photos[openIndex];

  return (
    <>
      <div className="relative">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => {
                setDirection(1);
                setOpenIndex(i);
              }}
              aria-label={photo.caption || `Ampliar foto ${i + 1}`}
              className="relative aspect-[4/3] w-full shrink-0 snap-center overflow-hidden rounded-[15px] bg-black/5"
            >
              {/* `contain` en vez de `cover`: una foto horizontal se ve
                  completa en vez de recortada por los lados. */}
              <Image
                src={photo.url}
                alt={photo.caption || ""}
                fill
                sizes="(max-width: 768px) 100vw, 1024px"
                className="object-contain"
              />
              {photo.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-left text-sm text-white">
                  {photo.caption}
                </span>
              )}
            </button>
          ))}
        </div>

        {photos.length > 1 && (
          <>
            <button
              onClick={() => step(-1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--event-primary)] shadow backdrop-blur"
            >
              <Arrow dir="prev" />
            </button>
            <button
              onClick={() => step(1)}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--event-primary)] shadow backdrop-blur"
            >
              <Arrow dir="next" />
            </button>

            <div className="mt-4 flex justify-center gap-2">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => scrollTo(i)}
                  aria-label={`Ir a la foto ${i + 1}`}
                  aria-current={i === index}
                  className={`h-2 rounded-full transition-all ${
                    i === index
                      ? "w-6 bg-[var(--event-accent)]"
                      : "w-2 bg-[var(--event-primary)]/25"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setOpenIndex(null)}
          onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX === null) return;
            const delta = e.changedTouches[0].clientX - touchStartX;
            // 50px evita que un toque tembloroso cuente como deslizamiento.
            if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
            setTouchStartX(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* La imagen no cierra el visor al tocarla: solo el fondo. */}
          <div
            className="relative h-[78svh] w-full max-w-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* `mode="popLayout"` deja que la foto saliente y la entrante se
                crucen sin empujarse. `custom` pasa la dirección a las variantes. */}
            <AnimatePresence
              initial={false}
              mode="popLayout"
              custom={direction}
            >
              <motion.div
                key={current.id}
                custom={direction}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <Image
                  src={current.url}
                  alt={current.caption || ""}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur sm:left-6"
              >
                <Arrow dir="prev" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="Foto siguiente"
                className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur sm:right-6"
              >
                <Arrow dir="next" />
              </button>
            </>
          )}

          <div className="absolute inset-x-0 bottom-6 text-center text-sm text-white/70">
            {current.caption && <p className="mb-1">{current.caption}</p>}
            {openIndex! + 1} / {photos.length}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenIndex(null);
            }}
            aria-label="Cerrar"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-3xl leading-none text-white"
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
}
