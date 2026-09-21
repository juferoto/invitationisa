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

type FieldType = "text" | "multiline" | "datetime" | "color" | "icon";

type Field = {
  key: keyof Event;
  label: string;
  type?: FieldType;
  wide?: boolean;
};

/**
 * Los campos se agrupan en bloques con el mismo nombre y el mismo orden que
 * las secciones de la invitación, para que quien edite sepa qué está tocando
 * sin tener que abrir la página y compararla.
 */
const GROUPS: { title: string; help: string; fields: Field[] }[] = [
  {
    title: "Portada del sobre",
    help: "Lo que se lee sobre la solapa antes de abrir la invitación.",
    fields: [
      { key: "celebrantName", label: "Nombre de la quinceañera" },
      { key: "title", label: "Título (ej. Mis XV Años)" },
    ],
  },
  {
    title: "Bienvenida",
    help: "Las dos primeras secciones al abrir el sobre.",
    fields: [
      {
        key: "introMessage",
        label: "Mensaje de bienvenida (va entre comillas)",
        type: "multiline",
        wide: true,
      },
      {
        key: "blessing",
        label: "Línea de entrada, antes de padres y padrinos",
        type: "multiline",
        wide: true,
      },
    ],
  },
  {
    title: "Padres y padrinos",
    help: "Un nombre por línea. Si lo dejas vacío, la sección no aparece.",
    fields: [
      { key: "parents", label: "Padres", type: "multiline" },
      { key: "godparents", label: "Padrinos", type: "multiline" },
    ],
  },
  {
    title: "Fecha del evento",
    help: "Alimenta la cuenta regresiva y el plazo para confirmar.",
    fields: [
      { key: "eventDate", label: "Fecha y hora del evento", type: "datetime" },
      { key: "rsvpDeadline", label: "Límite para confirmar", type: "datetime" },
      { key: "dateIcon", label: "Icono de la sección", type: "icon" },
    ],
  },
  {
    title: "Código de vestuario",
    help: "La forma arriba, y debajo qué se espera de cada quien.",
    fields: [
      {
        key: "dressCodeStyle",
        label: "Forma de vestir (formal, casual, hawaiana…)",
      },
      { key: "dressCodeWomen", label: "Mujeres (ej. vestido largo)" },
      { key: "dressCodeMen", label: "Hombres (ej. traje formal)" },
      {
        key: "reservedColors",
        label: "Colores reservados (separados por coma)",
      },
      {
        key: "dressCode",
        label: "Nota adicional",
        type: "multiline",
        wide: true,
      },
    ],
  },
  {
    title: "Lluvia de sobres",
    help: "La sección de regalos.",
    fields: [
      { key: "giftMessage", label: "Mensaje", type: "multiline", wide: true },
    ],
  },
  {
    title: "Galería compartida",
    help: "Invita a los asistentes a subir sus fotos y a usar el hashtag.",
    fields: [
      { key: "shareTitle", label: "Título (ej. ¡Vive mis XV conmigo!)" },
      { key: "shareUploadUrl", label: 'Enlace del botón "Subir fotos"' },
      { key: "shareMessage", label: "Mensaje", type: "multiline", wide: true },
      { key: "hashtagLabel", label: "Texto antes del hashtag" },
      { key: "hashtag", label: "Hashtag" },
    ],
  },
  {
    title: "Despedida",
    help: "El cierre de la invitación, al pie de todo.",
    fields: [
      { key: "closingTitle", label: "Título" },
      { key: "closingSignoff", label: "Remate (ej. ¡Te espero!)" },
      {
        key: "closingMessage",
        label: "Mensaje",
        type: "multiline",
        wide: true,
      },
    ],
  },
  {
    title: "Apariencia",
    help: "Los dos colores de los que sale toda la paleta de la invitación.",
    fields: [
      { key: "themePrimary", label: "Color principal", type: "color" },
      { key: "themeAccent", label: "Color de acento", type: "color" },
    ],
  },
];

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

      {GROUPS.map((group) => (
        <section key={group.title} className="mt-10">
          <h2 className="font-display text-2xl">{group.title}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{group.help}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <label
                key={field.key}
                className={field.wide ? "sm:col-span-2" : undefined}
              >
                <span className="text-sm text-[var(--color-muted)]">
                  {field.label}
                </span>
                {field.type === "multiline" && (
                  <textarea
                    rows={2}
                    value={String(event[field.key] ?? "")}
                    onChange={(e) => set(field.key, e.target.value)}
                    className="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
                  />
                )}
                {field.type === "datetime" && (
                  <input
                    type="datetime-local"
                    value={toLocalInput(String(event[field.key] ?? ""))}
                    onChange={(e) =>
                      set(field.key, fromLocalInput(e.target.value))
                    }
                    className="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
                  />
                )}
                {field.type === "color" && (
                  <input
                    type="color"
                    value={String(event[field.key] ?? "#000000")}
                    onChange={(e) => set(field.key, e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-black/15"
                  />
                )}
                {field.type === "icon" && (
                  <div className="mt-1 grid">
                    <IconField
                      value={String(event[field.key] ?? "")}
                      onChange={(value) => set(field.key, value)}
                    />
                  </div>
                )}
                {!field.type && (
                  <input
                    value={String(event[field.key] ?? "")}
                    onChange={(e) => set(field.key, e.target.value)}
                    className="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="font-display text-2xl">Lugares</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Ceremonia y recepción. Cada uno muestra sus datos y un mapa.
        </p>
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
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          La línea de tiempo del evento. Si está vacío, la sección no aparece.
        </p>
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
