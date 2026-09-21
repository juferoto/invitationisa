export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl text-[var(--event-primary)]">
        Invitación no encontrada
      </h1>
      <p className="text-[var(--color-muted)]">
        Revisa que el enlace esté completo. Si lo copiaste de un mensaje, puede
        haberse cortado.
      </p>
    </main>
  );
}
