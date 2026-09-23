"use client";

/**
 * Teléfono partido en dos: el indicativo del país y el número.
 *
 * WhatsApp exige el número en formato internacional —sin el indicativo, el
 * enlace `wa.me` no abre ninguna conversación—, y escribirlo a mano era la
 * forma más fácil de equivocarse. Aquí el indicativo se elige de una lista y
 * el campo de al lado solo admite dígitos.
 */

export type Country = { code: string; dial: string; name: string; flag: string };

/**
 * Países con más probabilidad de aparecer en una invitación colombiana: el
 * propio, los vecinos y los destinos habituales de la familia que emigró. No
 * pretende ser la lista completa del mundo; si falta uno, se añade aquí.
 */
export const COUNTRIES: Country[] = [
  { code: "CO", dial: "57", name: "Colombia", flag: "🇨🇴" },
  { code: "US", dial: "1", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "ES", dial: "34", name: "España", flag: "🇪🇸" },
  { code: "MX", dial: "52", name: "México", flag: "🇲🇽" },
  { code: "EC", dial: "593", name: "Ecuador", flag: "🇪🇨" },
  { code: "PE", dial: "51", name: "Perú", flag: "🇵🇪" },
  { code: "VE", dial: "58", name: "Venezuela", flag: "🇻🇪" },
  { code: "CL", dial: "56", name: "Chile", flag: "🇨🇱" },
  { code: "AR", dial: "54", name: "Argentina", flag: "🇦🇷" },
  { code: "PA", dial: "507", name: "Panamá", flag: "🇵🇦" },
  { code: "CR", dial: "506", name: "Costa Rica", flag: "🇨🇷" },
  { code: "BR", dial: "55", name: "Brasil", flag: "🇧🇷" },
  { code: "CA", dial: "1", name: "Canadá", flag: "🇨🇦" },
  { code: "IT", dial: "39", name: "Italia", flag: "🇮🇹" },
  { code: "GB", dial: "44", name: "Reino Unido", flag: "🇬🇧" },
];

/** El de la fiesta: es el que va a estar en casi todas las invitaciones. */
export const DEFAULT_COUNTRY = "CO";

/** Junta indicativo y número en lo que espera WhatsApp. */
export function fullPhone(country: string, number: string) {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "";
  const dial = COUNTRIES.find((c) => c.code === country)?.dial ?? "";
  return `+${dial}${digits}`;
}

export default function PhoneField({
  country,
  number,
  onCountry,
  onNumber,
}: {
  country: string;
  number: string;
  onCountry: (code: string) => void;
  onNumber: (value: string) => void;
}) {
  const dial = COUNTRIES.find((c) => c.code === country)?.dial ?? "";

  return (
    <div className="flex rounded-md border border-black/15 focus-within:border-[var(--event-primary)]">
      <select
        value={country}
        onChange={(e) => onCountry(e.target.value)}
        aria-label="País del teléfono"
        // `appearance-none` quita la flecha del sistema, que en este ancho
        // tapaba el indicativo.
        className="w-24 shrink-0 appearance-none rounded-l-md bg-transparent px-2 py-2 text-sm"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} +{c.dial}
          </option>
        ))}
      </select>

      <input
        value={number}
        // Solo dígitos: pegar un número con espacios, guiones o el propio
        // indicativo delante no debe romper el enlace de WhatsApp.
        onChange={(e) => onNumber(e.target.value.replace(/\D/g, ""))}
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={`WhatsApp (+${dial})`}
        aria-label="Número de WhatsApp"
        className="w-full min-w-0 rounded-r-md bg-transparent px-2 py-2 outline-none"
      />
    </div>
  );
}
