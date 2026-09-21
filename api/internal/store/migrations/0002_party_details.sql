-- "Detalles de mi fiesta": tarjetas con título y descripción (Puntualidad,
-- Estacionamiento, etc.). Antes esto vivía aplastado en events.notes como un
-- solo párrafo, que no permite darle estructura ni iconos.
CREATE TABLE IF NOT EXISTS party_details (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    icon        TEXT    NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_details_event ON party_details(event_id, sort_order);

-- Los eventos que ya existen arrancan con los dos detalles de la referencia,
-- para que la sección no aparezca vacía. Son editables desde el panel.
INSERT INTO party_details (event_id, title, description, icon, sort_order)
SELECT id, 'Puntualidad',
       'Tu presencia puntual hará parte de este recuerdo inolvidable.',
       'clock', 0
FROM events;

INSERT INTO party_details (event_id, title, description, icon, sort_order)
SELECT id, 'Estacionamiento',
       'Contaremos con servicio de estacionamiento para tu comodidad.',
       'car', 1
FROM events;
