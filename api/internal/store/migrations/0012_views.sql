-- Cuenta cuántas veces se ha abierto cada link, no solo la primera.
--
-- `opened_at` responde «¿ya lo vio?», que es lo que hace falta para insistir
-- por WhatsApp. Este contador responde otra cosa: si un link circuló. Un
-- invitado reenvía el suyo a diez conocidos y el consumo se multiplica sin
-- que aparezca ni un invitado nuevo en la lista; esta columna es la única
-- señal de que eso ocurrió.
ALTER TABLE guests ADD COLUMN views INTEGER NOT NULL DEFAULT 0;

-- Los que ya habían abierto antes de existir el contador cuentan como una.
UPDATE guests SET views = 1 WHERE opened_at IS NOT NULL;
