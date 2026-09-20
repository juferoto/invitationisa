import Ornament from "./Ornament";

/**
 * Título de sección. En la referencia la mayoría van en cursiva (Great Vibes):
 * Itinerario, Galería de fotos, Código de vestuario, Detalles de mi fiesta,
 * Sugerencia Musical y Lluvia de sobres. Solo "Fecha del evento" y los nombres
 * de los lugares usan la serif, así que la cursiva es el caso normal.
 */
export default function SectionTitle({
  children,
  ornament = true,
  className = "",
}: {
  children: React.ReactNode;
  ornament?: boolean;
  className?: string;
}) {
  return (
    <div className={`mb-8 text-center ${className}`}>
      <h2
        className="font-script leading-[1.1] text-[var(--event-primary)]"
        style={{ fontSize: "var(--text-script-sm)" }}
      >
        {children}
      </h2>
      {ornament && <Ornament className="mt-2" />}
    </div>
  );
}
