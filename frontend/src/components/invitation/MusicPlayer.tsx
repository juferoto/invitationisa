"use client";

import { useEffect, useRef, useState } from "react";

/** Botón flotante de música. Nunca arranca solo: los navegadores bloquean el
 *  autoplay con sonido y a nadie le gusta que una página suene sin avisar. */
export default function MusicPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="none" />
      <button
        onClick={toggle}
        aria-label={playing ? "Pausar música" : "Reproducir música"}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--event-primary)] text-white shadow-lg"
      >
        {playing ? "❚❚" : "♪"}
      </button>
    </>
  );
}
