-- Icono de la sección "Fecha del evento", hasta ahora fijo en el código.
-- Acepta un nombre propio (clock, parking, calendar…) o un código de Lordicon.
ALTER TABLE events ADD COLUMN date_icon TEXT NOT NULL DEFAULT '';

UPDATE events SET date_icon = 'calendar' WHERE date_icon = '';
