# API de invitaciones

Backend en Go. Sirve la invitación pública y el panel de administración.

Se despliega en Fly.io; el paso a paso está en el [`DEPLOY.md`](../DEPLOY.md)
de la raíz. Esta carpeta es autocontenida: su `go.mod`, su `Dockerfile` y su
`fly.toml` no dependen de nada de fuera, así que puede extraerse a su propio
repositorio moviéndola tal cual.

```bash
cp .env.example .env    # ajusta SEED_ADMIN_PASSWORD y JWT_SECRET
go run ./cmd/server     # :8080
```

- `cmd/server` — arranque, migraciones y reorganización del almacén
- `internal/api` — rutas públicas y del panel
- `internal/store` — SQLite y las migraciones embebidas
- `internal/storage` — disco local o S3/R2
- `internal/auth` — contraseñas y JWT
