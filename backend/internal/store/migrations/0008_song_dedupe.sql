-- Evita canciones repetidas: una lista con duplicados no le sirve al DJ.
-- `normalized` guarda título+artista en minúsculas y sin tildes; el índice
-- único es la red de seguridad si dos invitados envían a la vez.
ALTER TABLE song_requests ADD COLUMN normalized TEXT NOT NULL DEFAULT '';

UPDATE song_requests
SET normalized = lower(trim(title)) || '|' || lower(trim(artist))
WHERE normalized = '';

-- El índice único no se puede crear si ya hay repetidos: nos quedamos con la
-- sugerencia más antigua de cada canción.
DELETE FROM song_requests
WHERE id NOT IN (
    SELECT MIN(id) FROM song_requests GROUP BY event_id, normalized
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_songs_unique
    ON song_requests(event_id, normalized);
