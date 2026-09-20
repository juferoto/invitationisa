import type { ReactNode } from "react";

/**
 * Franja de sección a todo el ancho con su propio fondo. La referencia alterna
 * entre blanco, crema y azul claro, más una banda en azul rey sólido; eso es lo
 * que le da ritmo a la página en vez de un único fondo plano.
 */
export type Tone = "paper" | "cream" | "sky" | "royal";

const TONE: Record<Tone, string> = {
  paper: "bg-white",
  cream: "bg-[#f9f6f1]",
  sky: "bg-[#dce8ff]",
  royal: "bg-[var(--event-primary)] text-white",
};

export default function Band({
  tone = "paper",
  wide = false,
  children,
  className = "",
}: {
  tone?: Tone;
  /** La galería necesita más ancho para que las fotos horizontales respiren. */
  wide?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`w-full ${TONE[tone]} ${className}`}>
      <div className={`mx-auto px-5 py-16 ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
        {children}
      </div>
    </section>
  );
}
