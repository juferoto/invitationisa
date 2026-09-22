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
  SEED_ADMIN_PASSWORD="una-contraseña-larga" \
  CLOUDINARY_CLOUD_NAME="..." \
  CLOUDINARY_API_KEY="..." \
  CLOUDINARY_API_SECRET="..."
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

Con Cloudinary no hace falta `STORAGE_BASE_URL`: la dirección de cada archivo
se deduce de su clave y del nombre de tu cuenta. Solo tendrías que definirla
si sirvieras los medios desde el propio volumen (`STORAGE_DRIVER=local`), y
entonces sería `https://TU-API.fly.dev/media`.

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
| "Failed to fetch" con todo bien configurado | La máquina estaba suspendida y el navegador abortó | `auto_stop_machines = false` en `fly.toml` |
| `ROUTER_EXTERNAL_TARGET_HANDSHAKE_ERROR` en Vercel | Vercel no logra conectarse con la API al reenviar `/api/*`: casi siempre la máquina de Fly está caída o la cuenta suspendida por facturación | `fly status -a <app>`; si responde que la prueba terminó, añade tarjeta en fly.io/trial |

Si `fly launch` falló a mitad, la aplicación ya quedó creada en Fly. **No
repitas `fly launch`**: continúa con `fly deploy`.

### Empezar la base desde cero

Solo mientras no haya datos que perder. Hay que quitar la máquina antes que el
volumen, porque lo tiene montado, y volver a crearlo después: `fly deploy` no
lo crea solo, eso únicamente lo hace `fly launch`.

```bash
fly machine list
fly machine destroy <ID-MAQUINA> --force
fly volumes destroy <ID-VOLUMEN> --yes
fly volumes create datos --region dfw --size 1 --yes
fly deploy
```

Es lo que hay que hacer si el usuario admin quedó creado con la contraseña por
defecto: el servidor solo lo siembra cuando la tabla está vacía, así que
definir `SEED_ADMIN_PASSWORD` después no cambia nada.

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

## Por qué la API se llama por rutas relativas

El navegador nunca habla con el dominio de la API: Next reenvía `/api/*` desde
su servidor (ver `rewrites` en `next.config.ts`).

Sin eso, la cookie de sesión la emite el dominio de la API mientras navegas por
el de Vercel, o sea una **cookie de terceros**. Safari en iOS las bloquea por
completo, así que el panel devuelve al login en cada petición; en el escritorio
funciona porque Chrome todavía no las bloquea del todo.

Con el reenvío la cookie pasa a ser de primera parte y `COOKIE_SAMESITE` puede
volver a `lax`, que es más estricto frente a CSRF.

**El límite:** el proxy de Vercel no acepta cuerpos de más de **4,5 MB**. Un
archivo mayor hay que subirlo con la API apuntada directamente, o recomprimirlo.
Para audio, macOS convierte sin instalar nada:

```bash
afconvert -f m4af -d aac -b 96000 -q 127 -s 2 cancion.mp3 cancion.m4a
```

96 kbps en AAC suena igual que 256 kbps en MP3 por el altavoz de un teléfono,
y pesa la tercera parte.

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

## Los medios en Cloudinary

Los medios no viven en el volumen de Fly: van a Cloudinary y se sirven desde
su red de distribución. La razón es el dinero. El tráfico de salida es la
única parte variable de la factura de Fly, y el video es el 80% de ese
tráfico; sacándolo de ahí, la factura se queda en los 3,47 USD fijos de la
máquina y el disco.

Y hay una segunda razón, menos obvia: el plan gratuito de Cloudinary (25 GB
al mes, sin tarjeta) **deja de servir cuando se agota, no factura**. Si
alguien se pusiera a descargar el video en bucle, el peor caso es que la
invitación se quede sin fotos unas horas, no una factura sorpresa.

La configuración son tres secretos, que salen de la consola de Cloudinary: el
nombre está en el panel principal y la clave y el secreto en **Settings → API
Keys**.

```bash
fly secrets set \
  STORAGE_DRIVER=cloudinary \
  CLOUDINARY_CLOUD_NAME=... \
  CLOUDINARY_API_KEY=... \
  CLOUDINARY_API_SECRET=...
```

En Vercel, `NEXT_PUBLIC_MEDIA_HOST=res.cloudinary.com`, que es lo que autoriza
a `next/image` a optimizar esas imágenes.

**Los archivos ya subidos no se migran solos.** Vuelve a subirlos desde el
panel después del cambio.

### Cualquier almacén compatible con S3

El driver `s3` sigue ahí para R2, Backblaze B2 o MinIO, por si algún día
conviene mudarse:

```bash
fly secrets set \
  STORAGE_DRIVER=s3 \
  S3_ENDPOINT="ID-DE-CUENTA.r2.cloudflarestorage.com" \
  S3_BUCKET=invitaciones \
  S3_ACCESS_KEY=... \
  S3_SECRET_KEY=... \
  STORAGE_BASE_URL="https://media.tudominio.com"
```

No hay que tocar código: los tres drivers implementan la misma interfaz.

## Comprimir el video antes de subirlo

El video de entrada es, con diferencia, el archivo más pesado, y cada visita
se lo descarga entero. Comprimirlo es la palanca más eficaz que hay sobre el
tráfico, y de paso la invitación abre mucho más rápido con datos móviles.

```bash
brew install ffmpeg   # una vez

ffmpeg -i original.mp4 \
  -vf "scale=900:1600:flags=lanczos" \
  -c:v libx264 -profile:v high -preset veryslow -crf 27 \
  -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 96k \
  video-comprimido.mp4
```

Los números no son al azar: se midieron con VMAF, que estima la calidad tal
como la percibe una persona. Sobre el video de 15 MB de esta invitación, esa
receta da 3,19 MB con una puntuación de 92 sobre 100 —por encima de 90 los
defectos son difíciles de notar, y en la pantalla de un teléfono todavía
menos—. Bajar más de ahí empieza a verse.

`-movflags +faststart` mueve el índice al principio del archivo: sin eso el
navegador tiene que descargarlo entero antes de empezar a reproducir.

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
