# CRM de invitaciones

Plataforma para administrar una invitación digital de XV años: lista de
invitados, enlace personalizado por invitado, confirmación de asistencia y
medios del evento (fotos, música y video).

## Stack

| Capa | Elección | Por qué |
|------|----------|---------|
| Backend | Go 1.27 + chi | Binario estático de ~20 MB, arranque instantáneo, despliegue en Cloud Run / Fly.io sin JVM |
| Base de datos | SQLite (modernc.org/sqlite, sin cgo) | Un archivo, cero operación, backup con Litestream |
| Medios | Almacenamiento de objetos (disco local o Cloudflare R2) | Las imágenes, el audio y el video **nunca** entran a la base: solo se guarda la referencia |
| Frontend | Next.js 16 + TypeScript + Tailwind v4 + Motion | SSR para la miniatura de WhatsApp, responsive mobile-first |

### Por qué los medios no van en la base

Un video de 30 MB como BLOB infla el archivo SQLite, rompe el backup
incremental y hace lentos los queries. La tabla `media` guarda
`storage_key`, `mime`, `size_bytes` y el orden; el archivo vive detrás de un
CDN. Cambiar de disco local a R2 es cambiar una variable de entorno, porque
ambos implementan la interfaz `storage.Store`.

## Cómo funciona el link por invitado

Cada invitado tiene un `token` aleatorio de 12 bytes y un número de `passes`.
El enlace es `PUBLIC_URL/i/{token}`. La página pública devuelve **solo** el
nombre y los pases de ese invitado: nunca el teléfono, las notas internas ni
la lista de los demás. Al confirmar, el backend recorta el número de
asistentes al máximo de pases asignados, así que nadie puede confirmar de más
editando el formulario.

## Arrancar en local

Necesitas Go 1.27+ y Node 20+.

```bash
# Terminal 1 — API en :8080
cd backend
cp .env.example .env        # ajusta SEED_ADMIN_PASSWORD
go run ./cmd/server

# Terminal 2 — Web en :3000
cd frontend
npm install
npm run dev
```

En el primer arranque el backend aplica las migraciones, crea el usuario
admin con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` y siembra un evento de
ejemplo.

1. Entra a <http://localhost:3000/admin/login>.
2. En **Evento** llena los datos y los colores.
3. En **Medios** sube la foto de portada (sección *Portada*), la galería y la
   canción de fondo.
4. En **Invitados** agrega a la gente o importa un CSV
   (`nombre, pases, teléfono, correo, grupo`) y copia cada link.

## API

### Pública (solo necesita el token)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/public/invitation/{token}` | Datos del evento + el invitado |
| POST | `/api/public/invitation/{token}/rsvp` | Confirmar o declinar |
| POST | `/api/public/invitation/{token}/songs` | Sugerir canción |

### CRM (cookie de sesión)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/admin/login` · `/logout` | Sesión |
| GET | `/api/admin/summary` | Totales del dashboard |
| GET/PUT | `/api/admin/event` | Datos del evento |
| PUT | `/api/admin/venues` · `/itinerary` | Reemplazan la lista completa |
| GET/POST | `/api/admin/guests` | Listar y crear |
| POST | `/api/admin/guests/import` | Importar CSV |
| PUT/DELETE | `/api/admin/guests/{id}` | Editar y eliminar |
| GET/POST | `/api/admin/media` | Listar y subir |
| PUT | `/api/admin/media/reorder` · `/{id}` | Orden y descripción |
| DELETE | `/api/admin/media/{id}` | Eliminar archivo y registro |
| GET | `/api/admin/songs` | Sugerencias para el DJ |

## Despliegue

**Backend** — `docker build -t invitaciones-api backend/` produce una imagen
distroless. En Fly.io o Cloud Run monta un volumen para `data/` (o usa
Litestream contra R2 si quieres replicación continua).

**Medios en producción** — crea un bucket en R2, conéctale un dominio
(`media.tudominio.com`) y pon:

```
STORAGE_DRIVER=s3
S3_ENDPOINT=<account-id>.r2.cloudflarestorage.com
S3_BUCKET=invitaciones
S3_ACCESS_KEY=... S3_SECRET_KEY=...
STORAGE_BASE_URL=https://media.tudominio.com
```

R2 no cobra egreso, que es lo que importa cuando doscientos invitados abren la
galería y el video desde el teléfono.

**Frontend** — Vercel, o `npm run build && npm start` en un contenedor. Define
`NEXT_PUBLIC_API_URL` (la API pública) y `NEXT_PUBLIC_MEDIA_HOST` (el dominio
del bucket, para que `next/image` lo acepte).

## Si algo no se ve

**Las imágenes no cargan en desarrollo.** Next.js 16 bloquea que su optimizador
descargue imágenes de hosts que resuelven a IPs privadas, como el
`localhost:8080` del backend, y responde `400 "url" parameter is not allowed`.
Por eso `next.config.ts` activa `images.dangerouslyAllowLocalIP` **solo** en
desarrollo. En producción los medios salen de un dominio público
(`NEXT_PUBLIC_MEDIA_HOST`) y la protección queda activa, que es donde importa.

Si cambias `next.config.ts` tienes que reiniciar `npm run dev`: la configuración
no se recarga en caliente.

## Pendientes conocidos

- El panel no tiene edición en línea de invitados: hay `PUT /guests/{id}` en la
  API, pero la tabla solo permite crear y eliminar.
- Reordenar la galería arrastrando: el endpoint `media/reorder` existe, falta
  la interfaz.
- No hay envío automático de WhatsApp: el panel arma el enlace `wa.me` y tú lo
  envías.
