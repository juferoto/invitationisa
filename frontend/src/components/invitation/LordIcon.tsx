"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

// <lord-icon> es un custom element: TypeScript no lo conoce y hay que
// declararlo. En React 19 el namespace JSX vive dentro del módulo "react",
// ya no en el ámbito global.
declare module "react" {
  // El namespace es obligatorio aquí: así es como React tipa los elementos
  // JSX, no hay forma de declarar un custom element con sintaxis de módulos.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "lord-icon": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        trigger?: string;
        colors?: string;
        delay?: string | number;
      };
    }
  }
}

/**
 * Icono animado de Lordicon.
 *
 * El uso gratuito exige acreditar a Lordicon: el crédito va en el pie de la
 * invitación (ver `LordIconCredit`). No quites ese crédito sin contratar una
 * licencia de pago.
 *
 * Los colores se pasan como hex porque el componente web no resuelve
 * variables CSS; por eso el color del evento llega por props.
 */
export default function LordIcon({
  code,
  primary,
  secondary,
  className = "",
}: {
  /** Los 8 caracteres del código en cdn.lordicon.com/CODE.json */
  code: string;
  primary: string;
  secondary: string;
  className?: string;
}) {
  // Quien pidió menos movimiento ve el icono quieto en su primer fotograma.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <>
      {/* Next deduplica el script por src, así que da igual cuántos iconos haya. */}
      <Script
        src="https://cdn.lordicon.com/lordicon.js"
        strategy="afterInteractive"
      />
      <lord-icon
        src={`https://cdn.lordicon.com/${code}.json`}
        trigger={reducedMotion ? "none" : "loop"}
        delay="1200"
        colors={`primary:${primary},secondary:${secondary}`}
        className={className}
      />
    </>
  );
}

/** Crédito obligatorio por la licencia gratuita de Lordicon (CC BY-ND 4.0). */
export function LordIconCredit() {
  return (
    <p className="mt-6 text-xs text-[var(--color-muted)]">
      Iconos animados por{" "}
      <a
        href="https://lordicon.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        Lordicon.com
      </a>
    </p>
  );
}
