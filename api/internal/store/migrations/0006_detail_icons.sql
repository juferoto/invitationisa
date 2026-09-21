-- Iconos de los detalles, como en la referencia: reloj para la puntualidad,
-- la "P" de parking para el estacionamiento y un calendario para la
-- confirmación de asistencia.
UPDATE party_details SET icon = 'parking' WHERE icon = 'car';

-- El tercer detalle faltaba: la referencia lo tiene después del estacionamiento.
INSERT INTO party_details (event_id, title, description, icon, sort_order)
SELECT e.id,
       'Confirma tu asistencia',
       'Agradecemos confirmar a tiempo para preparar este día tan especial.',
       'calendar',
       (SELECT COALESCE(MAX(sort_order) + 1, 0) FROM party_details WHERE event_id = e.id)
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM party_details d
    WHERE d.event_id = e.id AND d.title = 'Confirma tu asistencia'
);
