import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getInvitation } from "@/lib/api";
import Band from "@/components/invitation/Band";
import Countdown from "@/components/invitation/Countdown";
import Cover from "@/components/invitation/Cover";
import Gallery from "@/components/invitation/Gallery";
import IntroVideo from "@/components/invitation/IntroVideo";
import LordIcon, { LordIconCredit } from "@/components/invitation/LordIcon";
import {
  HangerIcon,
  QuoteMark,
  UploadPhotoIcon,
  VinylIcon,
} from "@/components/invitation/Icons";
import SectionIcon from "@/components/invitation/SectionIcon";
import Ornament from "@/components/invitation/Ornament";
import Reveal from "@/components/invitation/Reveal";
import SectionTitle from "@/components/invitation/SectionTitle";
import RsvpForm from "@/components/invitation/RsvpForm";
import SongForm from "@/components/invitation/SongForm";
import type { Venue } from "@/lib/types";

type Props = { params: Promise<{ token: string }> };

// La miniatura que se ve al compartir el link por WhatsApp se arma aquí.
// Es la razón principal para renderizar la invitación en el servidor.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await getInvitation(token);
  if (!data) return { title: "Invitación no encontrada" };

  const cover = data.media.find(
    (m) => m.section === "hero" && m.kind === "image",
  );
  const title = `${data.event.title} · ${data.event.celebrantName}`;
  return {
    title,
    description: data.event.introMessage,
    openGraph: {
      title,
      description: data.event.introMessage,
      images: cover ? [cover.url] : undefined,
      type: "website",
    },
    robots: { index: false, follow: false }, // los links son privados
  };
}

const KIND_LABEL: Record<Venue["kind"], string> = {
  ceremony: "Ceremonia religiosa",
  reception: "Lugar de celebración",
  other: "Lugar del evento",
};

/** Dirección completa del lugar, para buscarla en el mapa. */
function fullAddress(venue: Venue) {
  return [venue.name, venue.address, venue.city].filter(Boolean).join(", ");
}

/**
 * Mapa incrustado sin clave de API. `output=embed` no es parte de la API
 * documentada de Google, pero es lo único que funciona sin facturación
 * habilitada; si algún día deja de servir, la salida es contratar la Maps
 * Embed API y cambiar solo esta función.
 */
function mapsEmbedSrc(venue: Venue) {
  return `https://www.google.com/maps?q=${encodeURIComponent(fullAddress(venue))}&output=embed`;
}

/** Enlace para abrir la app de mapas. Si el panel guardó uno propio, gana ese. */
function mapsLink(venue: Venue) {
  if (venue.mapsUrl) return venue.mapsUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(venue))}`;
}

/**
 * Convierte "19:00" en "7:00 pm". Si el panel guardó otra cosa (por ejemplo
 * "7 pm" o "medianoche"), se respeta tal cual en vez de romperlo.
 */
function formatTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23 || Number(minutes) > 59) return value;

  const suffix = hours < 12 ? "am" : "pm";
  // El 0 y el 12 son los que se escapan de un módulo ingenuo: medianoche es
  // 12 am y mediodía es 12 pm, no "0".
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export default async function InvitationPage({ params }: Props) {
  const { token } = await params;
  const data = await getInvitation(token);
  if (!data) notFound();

  const { event, venues, itinerary, details, media, guest } = data;
  // Dos fotos distintas, como en la referencia: una detrás del sobre en la
  // portada y otra al abrir la invitación. Si falta la de portada, se reutiliza
  // la de la invitación en vez de dejar el sobre sobre un fondo vacío.
  const hero = media.find((m) => m.section === "hero" && m.kind === "image");
  const coverPhoto =
    media.find((m) => m.section === "cover" && m.kind === "image") ?? hero;
  const photos = media.filter(
    (m) => m.section === "gallery" && m.kind === "image",
  );
  const dressCodeImage = media.find(
    (m) => m.section === "dresscode" && m.kind === "image",
  );
  const video = media.find((m) => m.kind === "video");
  const song = media.find((m) => m.kind === "audio");

  const parents = event.parents.split("\n").filter(Boolean);
  const godparents = event.godparents.split("\n").filter(Boolean);
  const colors = event.reservedColors
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <div
      style={
        {
          "--event-primary": event.themePrimary,
          "--event-accent": event.themeAccent,
        } as React.CSSProperties
      }
    >
      <IntroVideo src={video?.url}>
        <Cover
          celebrantName={event.celebrantName}
          title={event.title}
          guestName={guest.name}
          passes={guest.passes}
          coverUrl={coverPhoto?.url}
          musicSrc={song?.url}
        >
          <main className="pb-0">
            {/* Apertura: solo la foto. El nombre, la fecha y los pases ya se
              dijeron en el sobre; repetirlos aquí sobra. */}
            {hero && (
              // Aquí NO usamos next/image: `fill` obliga a fijar una relación de
              // aspecto y eso recorta la foto. Con una <img> normal se muestra
              // completa, sea vertical, horizontal o cuadrada, y funciona con
              // cualquier formato que suban (incluido AVIF).
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.url}
                alt=""
                className="w-full"
                decoding="async"
                fetchPriority="high"
              />
            )}

            {event.introMessage && (
              <Band tone="paper">
                <Reveal className="text-center">
                  <QuoteMark />
                  <p
                    className="my-5 font-display leading-relaxed text-[var(--color-ink)]"
                    style={{ fontSize: "var(--text-lead)" }}
                  >
                    {event.introMessage}
                  </p>
                  <QuoteMark flip />
                </Reveal>
              </Band>
            )}

            {(event.blessing ||
              parents.length > 0 ||
              godparents.length > 0) && (
              <Band tone="cream">
                <Reveal className="text-center">
                  {/* Línea de entrada antes de padres y padrinos. Se respetan los
                    saltos de línea tal como se escriben en el panel. */}
                  {event.blessing && (
                    <p
                      className="mb-10 font-script leading-[1.35] whitespace-pre-line text-[var(--event-primary)]"
                      style={{ fontSize: "var(--text-script-xs)" }}
                    >
                      {event.blessing}
                    </p>
                  )}

                  <div className="grid gap-10 sm:grid-cols-2">
                    {parents.length > 0 && (
                      <div>
                        <h2 className="font-display text-xl tracking-[0.05em] text-[var(--event-accent)]">
                          Mis padres
                        </h2>
                        {parents.map((name) => (
                          <p
                            key={name}
                            className="mt-2 font-display text-2xl sm:text-3xl"
                          >
                            {name}
                          </p>
                        ))}
                      </div>
                    )}
                    {godparents.length > 0 && (
                      <div>
                        <h2 className="font-display text-xl tracking-[0.05em] text-[var(--event-accent)]">
                          Mis padrinos
                        </h2>
                        {godparents.map((name) => (
                          <p
                            key={name}
                            className="mt-2 font-display text-2xl sm:text-3xl"
                          >
                            {name}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </Reveal>
              </Band>
            )}

            <Band tone="sky">
              <Reveal>
                {/* La referencia encabeza esta sección con un icono de calendario
                  y pone la fecha en cursiva. */}
                <SectionIcon
                  name={event.dateIcon}
                  primary={event.themePrimary}
                  secondary={event.themeAccent}
                  className="mx-auto h-12 w-12 text-[var(--event-accent)]"
                />
                <h2
                  className="mt-3 text-center font-display leading-tight text-[var(--event-primary)]"
                  style={{ fontSize: "var(--text-section)" }}
                >
                  Fecha del evento
                </h2>
                {/* Misma filigrana que cierra el título en las demás secciones. */}
                <Ornament className="mt-3" />
                <p
                  className="mb-10 mt-4 text-center font-script leading-tight text-[var(--event-primary)] first-letter:uppercase"
                  style={{ fontSize: "var(--text-script-sm)" }}
                >
                  {formatDate(event.eventDate)}
                </p>
                <Countdown eventDate={event.eventDate} />
              </Reveal>
            </Band>

            {venues.length > 0 && (
              <Band tone="paper">
                {venues.map((v) => (
                  <Reveal key={v.id} className="mb-14 last:mb-0">
                    {/* El título encabeza el bloque, fuera de la tarjeta; al no
                      estar limitado a media columna puede ir más grande. */}
                    <h3
                      className="text-center font-script leading-[1.15] text-[var(--event-primary)]"
                      style={{ fontSize: "var(--text-script-sm)" }}
                    >
                      {KIND_LABEL[v.kind] ?? "Lugar del evento"}
                    </h3>
                    <Ornament className="mb-6 mt-2" />

                    {/* Dos bloques independientes, no una tarjeta partida:
                      los datos a la izquierda y el mapa a la derecha. En móvil
                      la rejilla colapsa a una columna y quedan apilados.
                      Si no hay dirección no hay mapa, así que los datos ocupan
                      todo el ancho en vez de dejar media fila vacía. */}
                    <div
                      className={
                        v.address
                          ? "grid items-stretch gap-5 sm:grid-cols-2"
                          : ""
                      }
                    >
                      <div className="card p-7 text-center sm:text-left">
                        <p className="font-display text-3xl">{v.name}</p>
                        {v.startsAt && (
                          <p className="mt-1 text-[var(--event-primary)]">
                            Hora: {formatTime(v.startsAt)}
                          </p>
                        )}
                        {v.address && (
                          <p className="mt-3 text-sm text-[var(--event-primary)]">
                            {v.address}
                          </p>
                        )}
                        {v.city && (
                          <p className="text-sm text-[var(--event-primary)]">
                            {v.city}
                          </p>
                        )}
                        <a
                          href={mapsLink(v)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pill mt-6 inline-block border border-[var(--event-primary)]/40 px-6 py-2.5 text-xs uppercase tracking-[0.05em] text-[var(--event-primary)]"
                        >
                          Cómo llegar
                        </a>
                      </div>

                      {v.address && (
                        <div className="card relative min-h-64 overflow-hidden p-0">
                          <iframe
                            src={mapsEmbedSrc(v)}
                            title={`Mapa de ${v.name}`}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                            className="absolute inset-0 h-full w-full border-0"
                          />
                        </div>
                      )}
                    </div>
                  </Reveal>
                ))}
              </Band>
            )}

            {itinerary.length > 0 && (
              <Band tone="cream">
                <Reveal>
                  <SectionTitle>Itinerario</SectionTitle>
                  <ol className="relative mx-auto max-w-sm border-l border-[var(--event-accent)]/40 pl-6">
                    {itinerary.map((item) => (
                      <li key={item.id} className="mb-7 last:mb-0">
                        <span className="absolute -left-[5px] mt-2 block h-2.5 w-2.5 rounded-full bg-[var(--event-accent)]" />
                        <p className="text-sm text-[var(--event-accent)]">
                          {item.timeLabel}
                        </p>
                        <p className="font-display text-2xl">{item.title}</p>
                      </li>
                    ))}
                  </ol>
                </Reveal>
              </Band>
            )}

            {photos.length > 0 && (
              <Band tone="paper" wide>
                <Reveal>
                  <SectionTitle>Celebrando mis 15 años</SectionTitle>
                  <Gallery photos={photos} />
                </Reveal>
              </Band>
            )}

            {(event.dressCodeStyle ||
              event.dressCodeWomen ||
              event.dressCodeMen ||
              event.dressCode ||
              colors.length > 0) && (
              <Band tone="sky">
                <Reveal className="text-center">
                  <HangerIcon className="mx-auto mb-2 h-12 w-12 text-[var(--event-accent)]" />
                  <SectionTitle>Código de vestuario</SectionTitle>

                  {event.dressCodeStyle && (
                    <p className="mb-8 font-display text-3xl text-[var(--event-primary)] sm:text-4xl">
                      {event.dressCodeStyle}
                    </p>
                  )}

                  {/* Mujeres a la izquierda, la ilustración al centro, hombres a
                    la derecha. En móvil la imagen va primera para que no quede
                    partiendo el texto por la mitad.
                    `items-center` centraba cada columna por separado dentro de
                    una fila cuya altura la marcaba la imagen a ancho completo,
                    y por eso los títulos no cuadraban con sus textos. Ahora la
                    imagen tiene un ancho acotado y las dos columnas de texto
                    comparten la misma estructura, así los títulos quedan a la
                    misma altura aunque un texto ocupe dos líneas. */}
                  <div className="grid items-center gap-6 sm:grid-cols-3">
                    <div className="order-2 flex flex-col justify-center sm:order-1 sm:min-h-32">
                      <h3 className="font-display text-xl tracking-[0.05em] text-[var(--event-primary)]">
                        Mujeres
                      </h3>
                      <p className="mt-1 font-display text-2xl">
                        {event.dressCodeWomen}
                      </p>
                    </div>

                    {dressCodeImage && (
                      <div className="relative order-1 mx-auto aspect-[432/716] w-40 sm:order-2 sm:w-48">
                        <Image
                          src={dressCodeImage.url}
                          alt="Ilustración del código de vestuario"
                          fill
                          sizes="12rem"
                          className="object-contain"
                        />
                      </div>
                    )}

                    <div className="order-3 flex flex-col justify-center sm:min-h-32">
                      <h3 className="font-display text-xl tracking-[0.05em] text-[var(--event-primary)]">
                        Hombres
                      </h3>
                      <p className="mt-1 font-display text-2xl">
                        {event.dressCodeMen}
                      </p>
                    </div>
                  </div>

                  {event.dressCode && (
                    <p className="mt-8 text-[var(--color-ink)]">
                      {event.dressCode}
                    </p>
                  )}

                  {colors.length > 0 && (
                    <>
                      <p className="mt-8 font-display text-xl tracking-[0.05em] text-[var(--event-primary)]">
                        Colores reservados
                      </p>
                      <p className="mt-1 font-display text-2xl">
                        {colors.join(" · ")}
                      </p>
                    </>
                  )}
                </Reveal>
              </Band>
            )}

            {details.length > 0 && (
              <Band tone="paper">
                <Reveal>
                  <SectionTitle>Detalles de mi fiesta</SectionTitle>
                  {/* Cada detalle es una tarjeta propia apilada, no una rejilla:
                    así se lee individual y el tercero no queda huérfano en una
                    segunda fila. */}
                  <div className="space-y-8">
                    {details.map((detail) => (
                      <div key={detail.id} className="card p-8 text-center">
                        <SectionIcon
                          name={detail.icon}
                          primary={event.themePrimary}
                          secondary={event.themeAccent}
                        />
                        <h3 className="font-display text-3xl text-[var(--event-primary)] sm:text-4xl">
                          {detail.title}
                        </h3>
                        <p className="mx-auto mt-3 max-w-md text-[var(--color-muted)]">
                          {detail.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </Band>
            )}

            <Band tone="sky">
              <Reveal>
                <SectionTitle>Confirma tu asistencia</SectionTitle>
                {event.rsvpDeadline && (
                  <p className="mb-8 text-center text-sm text-[var(--color-muted)]">
                    Agradecemos confirmar antes del{" "}
                    {formatDate(event.rsvpDeadline)}.
                  </p>
                )}
                <RsvpForm
                  token={token}
                  guestName={guest.name}
                  passes={guest.passes}
                  initial={guest.rsvp}
                  deadline={event.rsvpDeadline}
                />
              </Reveal>
            </Band>

            <Band tone="cream">
              <Reveal>
                <VinylIcon className="mb-2" />
                <SectionTitle>Sugerencia musical</SectionTitle>
                <SongForm token={token} />
              </Reveal>
            </Band>

            {event.giftMessage && (
              <Band tone="paper">
                <Reveal className="text-center">
                  <LordIcon
                    code="ibydboev"
                    primary={event.themePrimary}
                    secondary={event.themeAccent}
                    className="mx-auto mb-2 block h-16 w-16"
                  />
                  <SectionTitle>Lluvia de sobres</SectionTitle>
                  <p>{event.giftMessage}</p>
                </Reveal>
              </Band>
            )}

            {(event.shareTitle || event.shareMessage || event.hashtag) && (
              <Band tone="sky">
                <Reveal className="text-center">
                  {event.shareTitle && (
                    <>
                      <LordIcon
                        code="bmlkvhui"
                        primary={event.themePrimary}
                        secondary={event.themeAccent}
                        className="mx-auto mb-2 block h-16 w-16"
                      />
                      <SectionTitle>{event.shareTitle}</SectionTitle>
                    </>
                  )}
                  {event.shareMessage && (
                    <p className="mx-auto max-w-md text-[var(--color-ink)]">
                      {event.shareMessage}
                    </p>
                  )}

                  {event.shareUploadUrl && (
                    <a
                      href={event.shareUploadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill mt-7 inline-flex items-center gap-2 bg-[var(--event-primary)] px-7 py-3.5 text-sm tracking-[0.05em] text-white shadow-lg"
                    >
                      <UploadPhotoIcon className="h-5 w-5" />
                      Subir fotos
                    </a>
                  )}

                  {event.hashtag && (
                    <>
                      {event.hashtagLabel && (
                        <p className="mt-8 text-sm text-[var(--color-muted)]">
                          {event.hashtagLabel}
                        </p>
                      )}
                      <p
                        className="mt-1 font-script text-[var(--event-primary)]"
                        style={{ fontSize: "var(--text-script-sm)" }}
                      >
                        {event.hashtag}
                      </p>
                    </>
                  )}
                </Reveal>
              </Band>
            )}

            {(event.closingTitle ||
              event.closingMessage ||
              event.closingSignoff) && (
              <Band tone="cream">
                <Reveal className="text-center">
                  {event.closingTitle && (
                    <p
                      className="font-script leading-[1.1] text-[var(--event-primary)]"
                      style={{ fontSize: "var(--text-script-sm)" }}
                    >
                      {event.closingTitle}
                    </p>
                  )}
                  <Ornament className="my-5" />
                  {event.closingMessage && (
                    <p
                      className="font-display leading-relaxed text-[var(--color-ink)]"
                      style={{ fontSize: "var(--text-lead)" }}
                    >
                      {event.closingMessage}
                    </p>
                  )}
                  {event.closingSignoff && (
                    <p
                      className="mt-6 font-script leading-[1.1] text-[var(--event-accent)]"
                      style={{ fontSize: "var(--text-script-sm)" }}
                    >
                      {event.closingSignoff}
                    </p>
                  )}
                  <LordIconCredit />
                </Reveal>
              </Band>
            )}
          </main>
        </Cover>
      </IntroVideo>
    </div>
  );
}
