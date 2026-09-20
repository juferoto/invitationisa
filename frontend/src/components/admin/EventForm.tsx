"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Event, ItineraryItem, PartyDetail, Venue } from "@/lib/types";

export type EventPayload = {
  event: Event;
  venues: Venue[];
  itinerary: ItineraryItem[];
  details: PartyDetail[];
};

// Campos del evento que son texto libre, en el orden en que se editan.
const FIELDS: { key: keyof Event; label: string; multiline?: boolean }[] = [
  { key: "celebrantName", label: "Nombre de la quinceañera" },
  { key: "title", label: "Título (ej. Mis XV Años)" },
  { key: "introMessage", label: "Mensaje de bienvenida", multiline: true },
  {
    key: "blessing",
    label: "Línea de entrada (antes de padres y padrinos)",
    multiline: true,
  },
  { key: "parents", label: "Padres (uno por línea)", multiline: true },
  { key: "godparents", label: "Padrinos (uno por línea)", multiline: true },
  {
    key: "dressCodeStyle",
    label: "Forma de vestir (formal, casual, hawaiana…)",
  },
  { key: "dressCodeWomen", label: "Mujeres (ej. vestido largo)" },
  { key: "dressCodeMen", label: "Hombres (ej. traje formal)" },
  { key: "dressCode", label: "Nota adicional de vestuario", multiline: true },
  { key: "reservedColors", label: "Colores reservados (separados por coma)" },
  { key: "giftMessage", label: "Mensaje de regalos", multiline: true },
  { key: "shareTitle", label: "Galería compartida: título" },
  {
    key: "shareMessage",
    label: "Galería compartida: mensaje",
    multiline: true,
  },
  {
    key: "shareUploadUrl",
    label: 'Galería compartida: enlace de "Subir fotos"',
  },
  { key: "hashtagLabel", label: "Texto antes del hashtag" },
  { key: "hashtag", label: "Hashtag" },
  { key: "closingTitle", label: "Despedida: título" },
  {
    key: "closingMessage",
    label: "Despedida: mensaje",
    multiline: true,
  },
  { key: "closingSignoff", label: "Despedida: remate (ej. ¡Te espero!)" },
];

// Iconos propios disponibles. El campo acepta además cualquier código de
// Lordicon (8 letras), que se copia desde lordicon.com en Export → Embed.
const ICON_NAMES = [
  "clock",
  "parking",
  "calendar",
  "hanger",
  "music",
  "vinyl",
  "gift",
  "camera",
  "upload",
];

const ICON_HELP =
  "Escribe un icono propio (clock, parking, calendar, hanger, music, vinyl, gift, camera, upload) o pega un código de Lordicon de 8 letras. Déjalo vacío para no mostrar ninguno.";

/** Campo de icono reutilizable, con sugerencias de los nombres propios. */
function IconField({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list="icon-names"
        placeholder="Icono"
        title={ICON_HELP}
        className={`rounded-md border border-black/15 px-3 py-2 ${className}`}
      />
      <datalist id="icon-names">
        {ICON_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}

const VENUE_PLACEHOLDER = {
  name: "Lugar",
  address: "Dirección",
  startsAt: "19:00",
  mapsUrl: "Link de mapa",
} as const;

/** Convierte RFC3339 a lo que espera <input type="datetime-local">. */
function toLocalInput(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : "";
}

/**
 * El formulario recibe los datos ya cargados y los copia a estado local.
 * La página lo monta con `key`, así que si el servidor devuelve otro evento
 * el componente se recrea con los valores nuevos.
 */
export default function EventForm({ initial }: { initial: EventPayload }) {
  const [event, setEvent] = useState(initial.event);
  const [venues, setVenues] = useState(initial.venues);
  const [itinerary, setItinerary] = useState(initial.itinerary);
  const [details, setDetails] = useState(initial.details);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof Event, value: string) =>
    setEvent((prev) => ({ ...prev, [key]: value }));

  async function save() {
    setError("");
    try {
      await apiFetch("/api/admin/event", {
        method: "PUT",
        body: JSON.stringify(event),
      });
      await apiFetch("/api/admin/venues", {
        method: "PUT",
        body: JSON.stringify(venues),
      });
      await apiFetch("/api/admin/itinerary", {
        method: "PUT",
        body: JSON.stringify(itinerary),
      });
      await apiFetch("/api/admin/details", {
        method: "PUT",
        body: JSON.stringify(details),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl text-[var(--event-primary)]">
        Evento
      </h1>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <label
            key={field.key}
            className={field.multiline ? "sm:col-span-2" : undefined}
          >
            <span className="text-sm text-[var(--color-muted)]">
              {field.label}
            </span>
            {field.multiline ? (
              <textarea
                rows={2}
                value={String(event[field.key] ?? "")}
                onChange={(e) => set(field.key, e.target.value)}
                className="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
              />
            ) : (
              <input
                value={String(event[field.key] ?? "")}
                onChange={(e) => set(field.key, e.target.value)}
                className="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
              />
            )}
          </label>
        ))}

        <label>
          <span className="text-sm text-[var(--color-muted)]">
            Fecha y hora del evento
          </span>
          <input
            type="datetime-local"
            value={toLocalInput(event.eventDate)}
            onChange={(e) => set("eventDate", fromLocalInput(e.target.value))}
            className="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <label>
          <span className="text-sm text-[var(--color-muted)]">
            Icono de la fecha del evento
          </span>
          <div className="mt-1 grid">
            <IconField
              value={event.dateIcon}
              onChange={(dateIcon) =>
                setEvent((prev) => ({ ...prev, dateIcon }))
              }
            />
          </div>
        </label>
        <label>
          <span className="text-sm text-[var(--color-muted)]">
            Límite para confirmar
          </span>
          <input
            type="datetime-local"
            value={toLocalInput(event.rsvpDeadline)}
            onChange={(e) =>
              set("rsvpDeadline", fromLocalInput(e.target.value))
            }
            className="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <label>
          <span className="text-sm text-[var(--color-muted)]">
            Color principal
          </span>
          <input
            type="color"
            value={event.themePrimary}
            onChange={(e) => set("themePrimary", e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-black/15"
          />
        </label>
        <label>
          <span className="text-sm text-[var(--color-muted)]">
            Color de acento
          </span>
          <input
            type="color"
            value={event.themeAccent}
            onChange={(e) => set("themeAccent", e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-black/15"
          />
        </label>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Lugares</h2>
        {venues.map((venue, i) => (
          <div key={i} className="mt-3 grid gap-2 sm:grid-cols-6">
            <select
              value={venue.kind}
              onChange={(e) =>
                setVenues(
                  venues.map((v, j) =>
                    j === i
                      ? { ...v, kind: e.target.value as Venue["kind"] }
                      : v,
                  ),
                )
              }
              className="rounded-md border border-black/15 px-3 py-2"
            >
              <option value="ceremony">Ceremonia</option>
              <option value="reception">Recepción</option>
              <option value="other">Otro</option>
            </select>
            {(["name", "address", "startsAt", "mapsUrl"] as const).map(
              (key) => (
                <input
                  key={key}
                  value={venue[key]}
                  placeholder={VENUE_PLACEHOLDER[key]}
                  onChange={(e) =>
                    setVenues(
                      venues.map((v, j) =>
                        j === i ? { ...v, [key]: e.target.value } : v,
                      ),
                    )
                  }
                  className="rounded-md border border-black/15 px-3 py-2"
                />
              ),
            )}
            <button
              onClick={() => setVenues(venues.filter((_, j) => j !== i))}
              className="text-xs text-red-600"
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            setVenues([
              ...venues,
              {
                id: 0,
                kind: "other",
                name: "",
                address: "",
                city: "",
                startsAt: "",
                mapsUrl: "",
                sortOrder: venues.length,
              },
            ])
          }
          className="mt-3 rounded-full border border-black/15 px-4 py-2 text-sm"
        >
          Agregar lugar
        </button>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Itinerario</h2>
        {itinerary.map((item, i) => (
          <div key={i} className="mt-3 grid gap-2 sm:grid-cols-4">
            <input
              value={item.timeLabel}
              placeholder="19:00"
              onChange={(e) =>
                setItinerary(
                  itinerary.map((it, j) =>
                    j === i ? { ...it, timeLabel: e.target.value } : it,
                  ),
                )
              }
              className="rounded-md border border-black/15 px-3 py-2"
            />
            <input
              value={item.title}
              placeholder="Cena"
              onChange={(e) =>
                setItinerary(
                  itinerary.map((it, j) =>
                    j === i ? { ...it, title: e.target.value } : it,
                  ),
                )
              }
              className="rounded-md border border-black/15 px-3 py-2 sm:col-span-2"
            />
            <button
              onClick={() => setItinerary(itinerary.filter((_, j) => j !== i))}
              className="text-xs text-red-600"
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            setItinerary([
              ...itinerary,
              {
                id: 0,
                timeLabel: "",
                title: "",
                icon: "",
                sortOrder: itinerary.length,
              },
            ])
          }
          className="mt-3 rounded-full border border-black/15 px-4 py-2 text-sm"
        >
          Agregar momento
        </button>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Detalles de mi fiesta</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Tarjetas como Puntualidad o Estacionamiento. {ICON_HELP}
        </p>
        {details.map((detail, i) => (
          <div key={i} className="mt-3 grid gap-2 sm:grid-cols-5">
            <IconField
              value={detail.icon}
              onChange={(icon) =>
                setDetails(
                  details.map((d, j) => (j === i ? { ...d, icon } : d)),
                )
              }
            />
            <input
              value={detail.title}
              placeholder="Puntualidad"
              onChange={(e) =>
                setDetails(
                  details.map((d, j) =>
                    j === i ? { ...d, title: e.target.value } : d,
                  ),
                )
              }
              className="rounded-md border border-black/15 px-3 py-2"
            />
            <input
              value={detail.description}
              placeholder="Descripción que verá el invitado"
              onChange={(e) =>
                setDetails(
                  details.map((d, j) =>
                    j === i ? { ...d, description: e.target.value } : d,
                  ),
                )
              }
              className="rounded-md border border-black/15 px-3 py-2 sm:col-span-2"
            />
            <button
              onClick={() => setDetails(details.filter((_, j) => j !== i))}
              className="text-xs text-red-600"
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            setDetails([
              ...details,
              {
                id: 0,
                title: "",
                description: "",
                icon: "",
                sortOrder: details.length,
              },
            ])
          }
          className="mt-3 rounded-full border border-black/15 px-4 py-2 text-sm"
        >
          Agregar detalle
        </button>
      </section>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <button
        onClick={save}
        className="sticky bottom-5 mt-10 w-full rounded-full bg-[var(--event-primary)] px-6 py-3 text-sm text-white"
      >
        {saved ? "¡Guardado!" : "Guardar cambios"}
      </button>
    </>
  );
}
