-- Bloque de galería compartida: invita a los asistentes a subir sus fotos y
-- a usar el hashtag. El enlace de subida apunta a donde el organizador quiera
-- (InvitePix, Google Fotos, un Drive compartido…).
ALTER TABLE events ADD COLUMN share_title      TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN share_message    TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN share_upload_url TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN hashtag_label    TEXT NOT NULL DEFAULT '';

UPDATE events SET
    share_title   = '¡Vive mis XV conmigo!',
    share_message = 'Comparte las fotos que captures en mi celebración.',
    hashtag_label = 'En Instagram usa el hashtag'
WHERE share_title = '';
