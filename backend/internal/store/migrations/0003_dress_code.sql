-- El código de vestuario pasa de un párrafo suelto a tres campos: la forma
-- (formal, casual, hawaiana…) y qué se espera de mujeres y de hombres, que es
-- como lo presenta la referencia.
ALTER TABLE events ADD COLUMN dress_code_style TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN dress_code_women TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN dress_code_men   TEXT NOT NULL DEFAULT '';

-- Valores de arranque para los eventos que ya existen.
UPDATE events SET
    dress_code_style = 'Formal elegante',
    dress_code_women = 'Vestido largo',
    dress_code_men   = 'Traje formal'
WHERE dress_code_style = '';
