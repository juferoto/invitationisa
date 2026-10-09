-- Enlace al que lleva el hashtag de la invitación.
--
-- El hashtag se mostraba como texto suelto: el invitado leía «usa #MisXV» y
-- tenía que buscarlo a mano. Con esto se convierte en un botón que abre
-- directamente el sitio donde se juntan las fotos —Instagram, un álbum
-- compartido, lo que sea—. Vacío, el hashtag sigue siendo texto.
ALTER TABLE events ADD COLUMN hashtag_url TEXT NOT NULL DEFAULT '';
