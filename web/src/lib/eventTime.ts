/**
 * Las fechas del evento se guardan sin huso horario: "2027-02-15T23:59"
 * significa esa hora en el lugar de la fiesta, no en el de quien mira la
 * invitación.
 *
 * Sin esto, `new Date("2027-02-15T23:59")` se interpreta con el huso del
 * dispositivo: a un invitado en Madrid el plazo se le cerraría seis horas
 * antes de lo que dice la propia invitación, y encima el servidor seguiría
 * aceptando su respuesta. Colombia no cambia la hora en verano, así que el
 * desfase es siempre el mismo.
 */
const EVENT_OFFSET = "-05:00";

/** Milisegundos desde época, o NaN si la fecha no se entiende. */
export function eventTime(value: string): number {
  if (!value) return NaN;
  // Si ya trae huso —una Z o un ±hh:mm al final— se respeta el que tenga.
  const conZona = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  const normalizado = value.includes("T") ? value : value.replace(" ", "T");
  return new Date(
    conZona ? normalizado : `${normalizado}${EVENT_OFFSET}`,
  ).getTime();
}
