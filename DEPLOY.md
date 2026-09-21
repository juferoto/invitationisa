# Despliegue en Vercel + Fly.io

El backend en Go con su volumen va a Fly.io; el frontend Next.js a Vercel.
Costo aproximado: **2–4 USD al mes** en Fly, Vercel gratis para uso personal.

Se despliega **primero el backend**, porque el frontend necesita su URL.

---

## 1. Backend en Fly.io

### 1.1 Instalar la herramienta y entrar

```bash
brew install flyctl
fly auth signup      # o: fly auth login
```

### 1.2 Crear la aplicación

**Ejecuta todos los comandos de Fly desde dentro de `api/`, nunca desde la
raíz del repositorio.** Fly usa el directorio actual como contexto de
compilación, y el Dockerfile espera encontrar ahí `go.mod` y `go.sum`. Desde
la raíz falla con `"/go.sum": not found`.

No basta con apuntar `--config ./api/fly.toml`: esa opción indica dónde está
la configuración, no dónde construir.

El `fly.toml` ya está en el repositorio, así que **no dejes que lo
regenere**:

```bash
cd api
fly launch --no-deploy --copy-config --name TU-API --region iad
```

Cambia `TU-API` por un nombre libre.

**Si cambias el nombre o la región, actualiza también `fly.toml`.** Y si
`fly launch` falla a mitad, no llega a escribirlos: `fly deploy` buscaría una
aplicación que no existe y respondería `app not found`.

```bash
grep -E '^app|^primary_region' fly.toml
```

### 1.3 Crear el volumen

Aquí viven la base de datos y los medios. Sin él, cada despliegue borraría
todo, porque el contenedor se reemplaza entero.

```bash
fly volumes create datos --region iad --size 1   # la MISMA región del fly.toml
```

1 GB sobra: la base pesa kilobytes y los medios unos pocos megabytes. Se puede
ampliar después sin recrearlo.

### 1.4 Cargar los secretos

```bash
fly secrets set \
  JWT_SECRET="$(openssl rand -base64 32)" \
  SEED_ADMIN_EMAIL="tu@correo.com" \
  SEED_ADMIN_PASSWORD="una-contraseña-larga"
```

`JWT_SECRET` firma las sesiones. Si no la defines, el servidor genera una al
azar en cada arranque y cualquier reinicio desconecta a todo el mundo.

Las credenciales del admin **solo se usan la primera vez**, cuando la tabla de
usuarios está vacía. Cambiarlas después no cambia la contraseña.

### 1.5 Primer despliegue

```bash
fly deploy
```

Al terminar, anota la URL: `https://TU-API.fly.dev`.

### 1.6 Completar las URLs

Ahora que conoces el dominio de la API, y antes de saber el de Vercel, deja
lista la parte que ya puedes:

```bash
fly secrets set STORAGE_BASE_URL="https://TU-API.fly.dev/media"
```

### 1.7 Comprobar

```bash
curl https://TU-API.fly.dev/health      # {"status":"ok"}
```

---

## 2. Frontend en Vercel

### 2.1 Subir el repositorio a GitHub

```bash
git remote add origin git@github.com:TU-USUARIO/invitationisa.git
git push -u origin main
```

### 2.2 Importar el proyecto

En [vercel.com/new](https://vercel.com/new), elige el repositorio y cambia
**un ajuste que no viene por defecto**:

- **Root Directory:** `web`

Sin eso, Vercel busca el `package.json` en la raíz y falla.

### 2.3 Variables de entorno

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://TU-API.fly.dev` |
| `NEXT_PUBLIC_MEDIA_HOST` | `TU-API.fly.dev` (solo el dominio, sin `https://`) |

`NEXT_PUBLIC_MEDIA_HOST` autoriza a `next/image` a optimizar imágenes de ese
dominio. Sin ella, las fotos responden 400.

### 2.4 Desplegar

Pulsa **Deploy**. Anota la URL: `https://TU-APP.vercel.app`.

---

## 3. Conectar los dos

De vuelta en `api/`:

```bash
fly secrets set \
  PUBLIC_URL="https://TU-APP.vercel.app" \
  CORS_ORIGIN="https://TU-APP.vercel.app"
```

`PUBLIC_URL` es la base con la que se construyen los enlaces de cada invitado
y los códigos QR. `CORS_ORIGIN` autoriza al navegador a llamar a la API desde
el panel.

Fly reinicia la máquina al cambiar secretos. Espera unos segundos y entra a
`https://TU-APP.vercel.app/admin/login`.

---

## Si algo falla

| Error | Causa | Solución |
|---|---|---|
| `Could not find a Dockerfile` | Lanzaste el comando desde la raíz | `cd api` y repite |
| `"/go.sum": not found` | El contexto de build es la raíz | `cd api && fly deploy`, o `fly deploy ./api` |
| `Volume not found` | El volumen está en otra región | Créalo en la misma del `primary_region` |
| El login funciona pero el panel da 401 | La cookie no viaja entre dominios | `COOKIE_SAMESITE=none` y HTTPS en ambos |
| Las fotos dan 400 | Falta autorizar el dominio | Define `NEXT_PUBLIC_MEDIA_HOST` en Vercel |

Si `fly launch` falló a mitad, la aplicación ya quedó creada en Fly. **No
repitas `fly launch`**: continúa con `fly deploy`.

## 4. Comprobación final

1. **Login** en `/admin/login` con las credenciales del paso 1.4.
2. **Medios** → sube una foto. Debe aparecer en la lista.
3. **Invitados** → crea uno y copia su enlace.
4. Abre ese enlace en el móvil: sobre, música, galería.
5. **Confirma asistencia** desde la invitación y revisa que aparezca en
   *Resumen*.

Si el login funciona pero el panel da 401 en todo, es la cookie: revisa que
`COOKIE_SAMESITE=none` esté puesto en `fly.toml` y que ambos sitios usen HTTPS.

---

## Sobre los dominios y la cookie

Con `TU-APP.vercel.app` y `TU-API.fly.dev` el navegador ve **dos sitios
distintos**, y una cookie `SameSite=Lax` no viaja entre ellos. Por eso el
`fly.toml` trae `COOKIE_SAMESITE=none`, que sí la envía pero exige HTTPS en
ambos extremos.

**Con un dominio propio esto mejora.** Si apuntas:

- `invitacion.tudominio.com` → Vercel
- `api.tudominio.com` → Fly

ambos comparten dominio registrable, la cookie vuelve a ser de primera parte y
puedes cambiar a `COOKIE_SAMESITE=lax`, que es más estricto frente a CSRF.
Además los enlaces que mandas por WhatsApp se ven como tuyos y no como los de
una plataforma.

---

## Mover los medios a Cloudflare R2

El volumen de Fly funciona, pero si muchos invitados cargan la canción y las
fotos, ese tráfico sale de tu máquina. R2 no cobra egreso y sirve desde el
nodo más cercano a cada invitado.

Crea un bucket, conéctale un dominio y cambia los secretos:

```bash
fly secrets set \
  STORAGE_DRIVER=s3 \
  S3_ENDPOINT="ID-DE-CUENTA.r2.cloudflarestorage.com" \
  S3_BUCKET=invitaciones \
  S3_ACCESS_KEY=... \
  S3_SECRET_KEY=... \
  STORAGE_BASE_URL="https://media.tudominio.com"
```

No hay que tocar código: los dos drivers implementan la misma interfaz. Ojo
con un detalle: **los archivos ya subidos no se migran solos**. Vuelve a
subirlos desde el panel, o cópialos del volumen al bucket antes del cambio.

---

## Actualizaciones

- **Frontend:** cada `git push` a `main` despliega solo.
- **Backend:** `cd api && fly deploy`.

Las migraciones de la base corren al arrancar, así que no hay paso aparte.

---

## Antes de mandar la invitación

- [ ] `JWT_SECRET` definida, no la generada al azar
- [ ] Contraseña del admin cambiada, no la del ejemplo
- [ ] La canción recomprimida a 128 kbps si pesa varios megabytes
- [ ] Probado desde un móvil con datos, no solo por wifi
- [ ] Una copia del volumen: `fly ssh console -C "tar czf - /data" > respaldo.tgz`
