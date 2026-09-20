-- Línea de entrada que antecede a padres y padrinos.
ALTER TABLE events ADD COLUMN blessing TEXT NOT NULL DEFAULT '';

UPDATE events SET blessing = 'Con la bendición de Dios y
el amor de mi familia'
WHERE blessing = '';
