-- El panel pasa a usar JWT firmados: el token lleva su vencimiento y se valida
-- sin consultar la base, así que esta tabla queda sin uso.
DROP TABLE IF EXISTS sessions;
