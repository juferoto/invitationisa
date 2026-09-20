import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-4xl text-[var(--event-primary)]">
        Invitaciones digitales
      </h1>
      <p className="text-[var(--color-muted)]">
        Cada invitado recibe un enlace propio con su nombre y sus pases. Desde el
        panel administras la lista, las confirmaciones y los medios del evento.
      </p>
      <Link
        href="/admin"
        className="rounded-full bg-[var(--event-primary)] px-8 py-3 text-sm font-medium tracking-wide text-white"
      >
        Entrar al panel
      </Link>
    </main>
  );
}
