export type Event = {
  id: number;
  slug: string;
  celebrantName: string;
  title: string;
  introMessage: string;
  eventDate: string;
  dateIcon: string;
  rsvpDeadline: string;
  blessing: string;
  parents: string;
  godparents: string;
  dressCode: string;
  dressCodeStyle: string;
  dressCodeWomen: string;
  dressCodeMen: string;
  reservedColors: string;
  giftMessage: string;
  hashtag: string;
  hashtagLabel: string;
  shareTitle: string;
  shareMessage: string;
  shareUploadUrl: string;
  notes: string;
  closingTitle: string;
  closingMessage: string;
  closingSignoff: string;
  themePrimary: string;
  themeAccent: string;
};

export type Venue = {
  id: number;
  kind: "ceremony" | "reception" | "other";
  name: string;
  address: string;
  city: string;
  startsAt: string;
  mapsUrl: string;
  sortOrder: number;
};

export type ItineraryItem = {
  id: number;
  timeLabel: string;
  title: string;
  icon: string;
  sortOrder: number;
};

export type PartyDetail = {
  id: number;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
};

export type Media = {
  id: number;
  kind: "image" | "audio" | "video";
  section: string;
  url: string;
  mime: string;
  sizeBytes: number;
  caption: string;
  sortOrder: number;
  createdAt: string;
};

export type Rsvp = {
  status: "confirmed" | "declined";
  attendingCount: number;
  message: string;
  respondedAt: string;
};

export type Guest = {
  id: number;
  token: string;
  name: string;
  passes: number;
  phone: string;
  email: string;
  groupLabel: string;
  notes: string;
  closingTitle: string;
  closingMessage: string;
  closingSignoff: string;
  openedAt: string | null;
  createdAt: string;
  rsvp?: Rsvp | null;
  link: string;
};

export type Invitation = {
  event: Event;
  venues: Venue[];
  itinerary: ItineraryItem[];
  details: PartyDetail[];
  media: Media[];
  guest: { name: string; passes: number; rsvp: Rsvp | null };
};

export type Summary = {
  guests: number;
  totalPasses: number;
  confirmed: number;
  declined: number;
  pending: number;
  attendingSeats: number;
  opened: number;
};

export type SongRequest = {
  id: number;
  guestName: string;
  title: string;
  artist: string;
  createdAt: string;
};
