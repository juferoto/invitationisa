"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Enlace de la barra del panel que se marca cuando es la sección actual.
 *
 * «Resumen» vive en /admin, que es prefijo de todas las demás, así que esa se
 * compara exacta y el resto por prefijo: /admin/guests/algo sigue siendo
 * Invitados.
 */
export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active =
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      // `aria-current` es lo que anuncia un lector de pantalla; el color solo
      // lo ve quien mira.
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "font-medium text-[var(--event-primary)] underline decoration-2 underline-offset-8"
          : "text-[var(--color-muted)] hover:text-[var(--event-primary)]"
      }
    >
      {children}
    </Link>
  );
}
