import {
  CalendarIcon,
  ClockIcon,
  EnvelopeGiftIcon,
  HangerIcon,
  InstagramIcon,
  MusicNoteIcon,
  ParkingIcon,
  UploadPhotoIcon,
  VinylIcon,
} from "./Icons";
import LordIcon from "./LordIcon";

/** Iconos propios disponibles por nombre desde el panel. */
const BUILT_IN = {
  clock: ClockIcon,
  parking: ParkingIcon,
  calendar: CalendarIcon,
  hanger: HangerIcon,
  music: MusicNoteIcon,
  vinyl: VinylIcon,
  gift: EnvelopeGiftIcon,
  camera: InstagramIcon,
  upload: UploadPhotoIcon,
} as const;

export const BUILT_IN_NAMES = Object.keys(BUILT_IN);

// Los códigos de Lordicon son ocho letras minúsculas. Ojo: "calendar" también
// tiene ocho, así que los nombres propios se resuelven primero.
const LORDICON_CODE = /^[a-z]{8}$/;

/**
 * Resuelve el icono de una sección desde el valor guardado en la base:
 * un nombre propio o un código de Lordicon.
 */
export default function SectionIcon({
  name,
  primary,
  secondary,
  className = "mx-auto mb-2 h-12 w-12 text-[var(--event-accent)]",
}: {
  name: string;
  primary: string;
  secondary: string;
  className?: string;
}) {
  const key = name.trim().toLowerCase();
  if (!key) return null;

  const Built = BUILT_IN[key as keyof typeof BUILT_IN];
  if (Built) return <Built className={className} />;

  if (LORDICON_CODE.test(key)) {
    return (
      <LordIcon
        code={key}
        primary={primary}
        secondary={secondary}
        className="mx-auto mb-2 block h-16 w-16"
      />
    );
  }
  return null;
}
