-- Revocación de tokens. Un JWT es válido por sí mismo hasta que vence, así que
-- para poder anularlo antes hacen falta dos mecanismos:
--
--  1. revoked_tokens: anula UN token concreto, por su identificador (jti).
--     Es lo que hace el botón de salir.
--  2. tokens_valid_from: anula TODOS los tokens emitidos antes de un momento.
--     Sirve para "cerrar sesión en todos los dispositivos" y para invalidar
--     lo existente si se cambia la contraseña.
CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti        TEXT PRIMARY KEY,
    expires_at TEXT NOT NULL
);

ALTER TABLE admin_users ADD COLUMN tokens_valid_from TEXT NOT NULL DEFAULT '';
