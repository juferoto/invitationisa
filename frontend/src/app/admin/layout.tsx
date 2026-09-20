import Link from "next/link";

const NAV = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/guests", label: "Invitados" },
  { href: "/admin/evento", label: "Evento" },
  { href: "/admin/medios", label: "Medios" },
  { href: "/admin/canciones", label: "Canciones" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-black/10">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-sm">
          <span className="font-display text-lg text-[var(--event-primary)]">
            CRM
          </span>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[var(--color-muted)] hover:text-[var(--event-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
