"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Tamaño de fuente en unidades del propio sobre (1cqw = 1% de su ancho).
 * La solapa es un triángulo que se angosta hacia la punta, así que el texto
 * tiene poco espacio: encogemos según el largo en vez de confiar en que un
 * `clamp` fijo alcance para cualquier nombre.
 */
function fitName(text: string) {
  const n = text.trim().length;
  if (n <= 8) return 13;
  if (n <= 12) return 10.5;
  if (n <= 18) return 8;
  if (n <= 26) return 6;
  return 4.8;
}

function fitTitle(text: string) {
  const n = text.trim().length;
  if (n <= 14) return 3;
  if (n <= 24) return 2.4;
  return 2;
}

/** Icono de mano haciendo click, como el de la referencia. */
function ClickIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 11V6a1.5 1.5 0 0 1 3 0v4.5" />
      <path d="M12 10.5V5a1.5 1.5 0 0 1 3 0v5.5" />
      <path d="M15 10.5V7a1.5 1.5 0 0 1 3 0v6.5a7 7 0 0 1-7 7h-.7a6 6 0 0 1-4.4-1.95l-2.6-2.85a1.5 1.5 0 0 1 2.2-2.05L9 15.5" />
      <path d="M9 15.5V8a1.5 1.5 0 0 0-3 0v5" />
    </svg>
  );
}

/**
 * Portada que se muestra antes de la invitación: foto difuminada y sobre a la
 * izquierda, saludo al invitado a la derecha. En móvil se apila, con la foto y
 * el sobre primero.
 */
export default function Cover({
  celebrantName,
  title,
  guestName,
  passes,
  coverUrl,
  musicSrc,
  children,
}: {
  celebrantName: string;
  title: string;
  guestName: string;
  passes: number;
  coverUrl?: string;
  /** Canción de fondo; arranca al abrir el sobre. */
  musicSrc?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  /**
   * El audio se lanza aquí, dentro del manejador del clic. Los navegadores
   * bloquean la reproducción con sonido salvo que la dispare un gesto del
   * usuario, y abrir el sobre lo es; hacerlo en un efecto posterior sería
   * menos fiable.
   */
  function openInvitation() {
    setOpen(true);
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(() => {
      // Si el navegador la rechaza igualmente, el botón flotante deja
      // arrancarla a mano.
      setPlaying(false);
    });
  }

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }

  // El estado del botón sigue al audio real, no al revés: así queda correcto
  // aunque el sistema operativo pause la reproducción por su cuenta.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  // Mientras la portada está visible no queremos scroll de fondo.
  useEffect(() => {
    if (open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Siempre montado, incluso con la portada cerrada: el elemento tiene
          que existir antes del clic para poder reproducirlo en ese mismo
          gesto. `loop` hace que se repita indefinidamente. */}
      {musicSrc && <audio ref={audioRef} src={musicSrc} loop preload="auto" />}

      {open && musicSrc && (
        <button
          onClick={toggleMusic}
          aria-label={playing ? "Pausar la música" : "Reproducir la música"}
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--event-primary)] text-white shadow-lg"
        >
          {playing ? "❚❚" : "♪"}
        </button>
      )}

      <AnimatePresence>
        {!open && (
          <motion.div
            className="fixed inset-0 z-50 grid grid-cols-1 overflow-y-auto bg-[var(--color-paper)] lg:grid-cols-2"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          >
            {/* Columna 1: foto + sobre. En móvil va primero. */}
            <div className="relative flex min-h-[70svh] items-center justify-center px-6 py-12 lg:min-h-screen">
              {/* El contenedor manda: la foto ocupa una parte y el sobre, más
                  ancho, se monta sobre su mitad. */}
              <div className="relative w-full max-w-lg sm:max-w-xl">
                {coverUrl ? (
                  <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-sm shadow-xl ring-1 ring-black/5">
                    <Image
                      src={coverUrl}
                      alt=""
                      fill
                      priority
                      sizes="(max-width: 1024px) 80vw, 40vw"
                      className="object-cover"
                    />
                    {/* El difuminado crece de arriba hacia abajo: la máscara
                        deja el tope nítido y va cubriendo hacia el pie. */}
                    <div
                      className="absolute inset-0 backdrop-blur-md"
                      style={{
                        maskImage:
                          "linear-gradient(to bottom, transparent 0%, black 55%)",
                        WebkitMaskImage:
                          "linear-gradient(to bottom, transparent 0%, black 55%)",
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/35" />
                  </div>
                ) : (
                  <div className="mx-auto aspect-[3/4] w-full rounded-sm bg-gradient-to-b from-[var(--event-primary)]/15 to-[var(--event-primary)]/40" />
                )}

                <motion.button
                  onClick={openInvitation}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  aria-label="Ver invitación"
                  className="group absolute inset-x-0 top-1/2 mx-auto w-[88%] -translate-y-1/2 cursor-pointer"
                >
                  {/* Flotación suave para que el sobre se sienta vivo. */}
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative"
                  >
                    <div className="envelope relative aspect-[4/3] w-full rounded-sm bg-[var(--color-paper)] shadow-2xl ring-1 ring-[var(--event-accent)]/40 [perspective:1200px]">
                      {/* Solapa del sobre: se abre hacia arriba al apuntarla.
                          Necesita perspectiva en el padre para verse en 3D. */}
                      <div
                        className="absolute inset-x-0 top-0 h-1/2 origin-top transform-3d bg-[var(--event-accent)]/20 transition-transform duration-700 ease-out group-hover:-rotate-x-40 group-focus-visible:-rotate-x-40"
                        style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
                      />
                      <div
                        className="absolute inset-x-0 top-0 h-1/2"
                        style={{
                          clipPath:
                            "polygon(0 0, 2px 0, 50% calc(100% - 2px), 100% 0, 100% 2px, 50% 100%, 0 2px)",
                          background: "var(--event-accent)",
                          opacity: 0.5,
                        }}
                      />

                      {/* La solapa ocupa la mitad superior y baja en V hasta el
                          centro. El bloque se limita a esa caja y se centra
                          dentro, así ni el nombre ni el título se salen. El
                          margen lateral es amplio porque el triángulo se
                          angosta hacia abajo. */}
                      <div className="absolute inset-x-0 top-0 flex h-1/2 flex-col items-center justify-center px-[12cqw] text-center">
                        <span
                          className="envelope-name block font-script text-[var(--event-primary)]"
                          style={{ fontSize: `${fitName(celebrantName)}cqw` }}
                        >
                          {celebrantName}
                        </span>
                        <span
                          className="envelope-title mt-[1.5cqw] block uppercase tracking-[0.1em] text-[var(--event-accent)]"
                          style={{ fontSize: `${fitTitle(title)}cqw` }}
                        >
                          {title}
                        </span>
                      </div>

                      <span className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.1em] text-[var(--event-primary)]">
                        <ClickIcon className="h-4 w-4" />
                        Ver invitación
                      </span>
                    </div>
                  </motion.div>
                </motion.button>
              </div>
            </div>

            {/* Columna 2: a quién va dirigida. En móvil queda debajo. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex min-h-[40svh] flex-col items-center justify-center gap-4 px-8 py-14 text-center lg:min-h-screen"
            >
              <p
                className="font-display leading-tight text-[var(--event-primary)]"
                style={{ fontSize: "var(--text-section)" }}
              >
                {guestName}
              </p>
              <p className="uppercase tracking-[0.1em] text-[var(--color-muted)] text-[length:var(--text-label)]">
                Hemos reservado
              </p>
              <p
                className="font-display leading-none text-[var(--event-accent)]"
                style={{ fontSize: "var(--text-display)" }}
              >
                {passes}
              </p>
              <p className="uppercase tracking-[0.1em] text-[var(--color-muted)] text-[length:var(--text-label)]">
                {passes === 1 ? "lugar en tu honor" : "lugares en tu honor"}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {open && children}
    </>
  );
}
