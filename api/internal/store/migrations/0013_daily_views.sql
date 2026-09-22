-- Aperturas por día, para poder sumar las del mes en curso.
--
-- El contador por invitado es acumulativo y no sabe cuándo ocurrió cada
-- apertura. El gasto del almacén de medios, en cambio, se mide por meses
-- naturales: sin fecha no hay forma de saber cuánto llevamos consumido de la
-- cuota de este mes, que es justo el aviso que hace falta antes de quedarse
-- sin fotos a mitad de la fiesta.
CREATE TABLE IF NOT EXISTS daily_views (
    day   TEXT PRIMARY KEY,               -- AAAA-MM-DD en UTC
    views INTEGER NOT NULL DEFAULT 0
);
