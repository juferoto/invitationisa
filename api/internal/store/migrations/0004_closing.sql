-- Mensaje de despedida al pie de la invitación: título, frase y remate.
ALTER TABLE events ADD COLUMN closing_title   TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN closing_message TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN closing_signoff TEXT NOT NULL DEFAULT '';

UPDATE events SET
    closing_title   = 'Gracias por acompañarme',
    closing_message = '¡Los mejores momentos de la vida merecen ser compartidos!',
    closing_signoff = '¡Te espero!'
WHERE closing_title = '';
