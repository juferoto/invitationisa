-- Esquema inicial del CRM de invitaciones.
-- Diseñado para un solo evento, pero todo cuelga de event_id para poder
-- pasar a multi-evento sin reescribir las tablas.

CREATE TABLE IF NOT EXISTS events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT    NOT NULL UNIQUE,
    celebrant_name  TEXT    NOT NULL,
    title           TEXT    NOT NULL DEFAULT '',
    intro_message   TEXT    NOT NULL DEFAULT '',
    event_date      TEXT    NOT NULL,              -- RFC3339, define la cuenta regresiva
    rsvp_deadline   TEXT    NOT NULL DEFAULT '',   -- RFC3339, vacío = sin límite
    parents         TEXT    NOT NULL DEFAULT '',   -- un nombre por línea
    godparents      TEXT    NOT NULL DEFAULT '',
    dress_code      TEXT    NOT NULL DEFAULT '',
    reserved_colors TEXT    NOT NULL DEFAULT '',   -- separados por coma
    gift_message    TEXT    NOT NULL DEFAULT '',
    hashtag         TEXT    NOT NULL DEFAULT '',
    notes           TEXT    NOT NULL DEFAULT '',   -- puntualidad, parqueadero, etc.
    theme_primary   TEXT    NOT NULL DEFAULT '#184aaf',
    theme_accent    TEXT    NOT NULL DEFAULT '#dcc888',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Lugares: ceremonia, recepción, o los que hagan falta.
CREATE TABLE IF NOT EXISTS venues (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    kind       TEXT    NOT NULL,                  -- ceremony | reception | other
    name       TEXT    NOT NULL,
    address    TEXT    NOT NULL DEFAULT '',
    city       TEXT    NOT NULL DEFAULT '',
    starts_at  TEXT    NOT NULL DEFAULT '',       -- "17:00"
    maps_url   TEXT    NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_venues_event ON venues(event_id, sort_order);

CREATE TABLE IF NOT EXISTS itinerary_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    time_label TEXT    NOT NULL,                  -- "19:00"
    title      TEXT    NOT NULL,                  -- "Cena"
    icon       TEXT    NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_itinerary_event ON itinerary_items(event_id, sort_order);

-- Un invitado = un token = un link personalizado con N pases.
CREATE TABLE IF NOT EXISTS guests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    token       TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,                 -- "Familia Rodríguez" o nombre propio
    passes      INTEGER NOT NULL DEFAULT 1,
    phone       TEXT    NOT NULL DEFAULT '',
    email       TEXT    NOT NULL DEFAULT '',
    group_label TEXT    NOT NULL DEFAULT '',      -- "Familia novia", "Colegio"...
    notes       TEXT    NOT NULL DEFAULT '',
    opened_at   TEXT,                             -- primera vez que abrió el link
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_guests_event ON guests(event_id, name);

-- Una fila por invitado; se sobrescribe si cambia de opinión.
CREATE TABLE IF NOT EXISTS rsvps (
    guest_id        INTEGER PRIMARY KEY REFERENCES guests(id) ON DELETE CASCADE,
    status          TEXT    NOT NULL,             -- confirmed | declined
    attending_count INTEGER NOT NULL DEFAULT 0,
    message         TEXT    NOT NULL DEFAULT '',
    responded_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS song_requests (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_id   INTEGER REFERENCES guests(id) ON DELETE SET NULL,
    title      TEXT    NOT NULL,
    artist     TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_songs_event ON song_requests(event_id);

-- Metadatos de medios. El archivo vive en disco o en R2, nunca como BLOB.
CREATE TABLE IF NOT EXISTS media (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    kind        TEXT    NOT NULL,                 -- image | audio | video
    section     TEXT    NOT NULL DEFAULT 'gallery', -- hero | gallery | music | video
    storage_key TEXT    NOT NULL,                 -- ruta dentro del bucket/disco
    mime        TEXT    NOT NULL DEFAULT '',
    size_bytes  INTEGER NOT NULL DEFAULT 0,
    caption     TEXT    NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_event ON media(event_id, section, sort_order);

CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
);
