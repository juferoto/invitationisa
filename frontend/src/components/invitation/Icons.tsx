/** Icono de calendario que encabeza la fecha del evento. */
export function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      className={className || "mx-auto h-10 w-10 text-[var(--event-accent)]"}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      {/* Los días del calendario se encienden en cascada. */}
      <circle
        className="anim-blink"
        cx="8.5"
        cy="14.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
      <circle
        className="anim-blink [animation-delay:0.4s]"
        cx="12"
        cy="14.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
      <circle
        className="anim-blink [animation-delay:0.8s]"
        cx="15.5"
        cy="14.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/**
 * Comilla decorativa. La referencia envuelve el mensaje de bienvenida entre dos
 * de estas, una arriba y otra abajo invertida.
 */
export function QuoteMark({
  flip = false,
  className = "",
}: {
  flip?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 36"
      fill="currentColor"
      className={`mx-auto h-7 w-10 text-[var(--event-accent)] ${flip ? "rotate-180" : ""} ${className}`}
      aria-hidden="true"
    >
      <path d="M20 4C10 7 3 15 3 25c0 5 3 8 8 8s8-3 8-8-3-8-7-8c0-4 4-8 9-10L20 4zM45 4c-10 3-17 11-17 21 0 5 3 8 8 8s8-3 8-8-3-8-7-8c0-4 4-8 9-10L45 4z" />
    </svg>
  );
}

/** Disco de vinilo con una nota musical encima, para la sugerencia musical. */
export function VinylIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`mx-auto h-14 w-14 text-[var(--event-accent)] ${className}`}
      aria-hidden="true"
    >
      {/* El disco gira; los surcos descentrados hacen visible la rotación. */}
      <g className="anim-spin">
        <circle cx="24" cy="29" r="15" />
        <circle cx="24" cy="29" r="7" />
        <circle cx="24" cy="29" r="1.6" fill="currentColor" stroke="none" />
        <path d="M24 14v3M24 41v3M9 29h3M36 29h3" />
      </g>
      {/* La nota se apoya sobre el borde superior del disco. */}
      <g className="anim-bob">
        <path d="M30 14V4l8 2v10" />
        <circle cx="27.5" cy="14.5" r="2.6" fill="currentColor" stroke="none" />
        <circle cx="35.5" cy="16.5" r="2.6" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

/** Reloj: círculo con manecillas, como el de la referencia. */
export function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      {/* La manecilla gira: es lo que hace legible que sea un reloj. */}
      <g className="anim-spin" style={{ transformOrigin: "12px 12px" }}>
        <path d="M12 6.5V12l4 2.5" />
      </g>
    </svg>
  );
}

/** "P" de estacionamiento dentro de un recuadro. */
export function ParkingIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path className="anim-pulse" d="M9.5 17V7h3.2a3 3 0 0 1 0 6H9.5" />
    </svg>
  );
}

/** Cámara con flecha de subida, para el botón de compartir fotos. */
export function UploadPhotoIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.1-2h6.4l1.1 2h2.2A1.5 1.5 0 0 1 19 8.5v9A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5" />
      <path d="M3 8.5v9A1.5 1.5 0 0 0 4.5 19" />
      <path d="M12 16.5V10m0 0-2.2 2.2M12 10l2.2 2.2" />
    </svg>
  );
}

/** Cámara estilo Instagram: el lente late y el flash parpadea. */
export function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle className="anim-pulse" cx="12" cy="12" r="4.2" />
      <circle
        className="anim-blink"
        cx="17"
        cy="7"
        r="1.1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/** Sobre con lazo para la lluvia de sobres: el lazo se balancea. */
export function EnvelopeGiftIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2.5" y="7" width="19" height="13" rx="2" />
      <path d="M2.5 8.5 12 15l9.5-6.5" />
      <g className="anim-sway">
        <path d="M12 7V4.6" />
        <path d="M12 4.6c-1.5-1.9-4-1-3.2.6.5 1 2 1 3.2 0z" />
        <path d="M12 4.6c1.5-1.9 4-1 3.2.6-.5 1-2 1-3.2 0z" />
      </g>
    </svg>
  );
}

/** Percha de ropa que oscila como un péndulo desde el gancho. */
export function HangerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <g className="anim-sway">
        <path d="M12 10V9a2 2 0 1 1 2-2" />
        <path d="M12 10 3.4 16.2a1.4 1.4 0 0 0 .8 2.5h15.6a1.4 1.4 0 0 0 .8-2.5L12 10z" />
      </g>
    </svg>
  );
}

/** Nota musical doble; las cabezas suben y bajan alternadas. */
export function MusicNoteIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <g className="anim-bob">
        <path d="M9 18V6l10-2v12" />
        <path d="M9 9l10-2" />
        <circle cx="6.5" cy="18" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="16.5" cy="16" r="2.5" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
