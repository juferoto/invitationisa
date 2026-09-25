# Invitación de XV años — notas para trabajar aquí

CRM y página pública de una invitación digital. Un solo evento, aunque el
esquema cuelga todo de `event_id` por si algún día son varios.

Contexto que no está en el código: el evento es en **Cali**; la invitación se
manda por WhatsApp y casi todos los invitados la abren desde el **teléfono**,
así que móvil primero y peso de descarga bajo no son adornos. La referencia de
diseño es una plantilla de Wix (`invitarco.wixstudio.com/misxv/elegancia-real`);
cuando haya duda de estilo, se mide contra ella en vez de inventar.

## Dónde vive cada cosa

| Carpeta | Qué | Dónde corre |
|---|---|---|
| `api/` | Go 1.27 + chi + SQLite | Fly.io (`invitationisa`, región dfw) |
| `web/` | Next.js 16 + Tailwind v4 | Vercel (`invitationisa-mo18`) |
| medios | fotos, video y canción | Cloudinary |

## Desplegar: son dos caminos distintos

```bash
cd api && fly deploy      # cualquier cambio dentro de api/
git push                  # cualquier cambio dentro de web/; Vercel reconstruye solo
```

Fly sube lo que haya en la máquina; Vercel solo se entera por GitHub. Un cambio
que toque las dos carpetas necesita las dos cosas, y es el descuido más
frecuente: el backend queda al día y el panel no.

## Antes de dar algo por bueno

```bash
cd api && go build ./... && go vet ./... && go test ./...
cd web && npx tsc --noEmit && npm run lint && npm run build
```

## Cómo se escribe aquí

- **Todo en español**: comentarios, mensajes de commit, textos de la interfaz y
  de error. El código (identificadores, tipos) en inglés como de costumbre.
- Los comentarios explican **por qué**, no qué hace la línea. Si algo tiene una
  forma rara, el comentario dice qué pasaba antes.
- Las decisiones con alternativa razonable se justifican donde viven, no en un
  documento aparte.

## Trampas conocidas

- **Huso horario**: las fechas se guardan en UTC (el panel manda RFC3339 con
  milisegundos) pero se interpretan en `America/Bogota`. Ver
  `api/internal/api/deadline.go`.
- **Migraciones**: se parten en sentencias sueltas porque Turso solo admite una
  por petición. Si añades una con punto y coma dentro de un texto, mira
  `splitStatements`.
- **Medios**: la URL se **deduce** de la clave, no se guarda. Cambiar de almacén
  no mueve archivos: para eso está `cmd/migratemedia`.
- **Secciones de un solo archivo** (portada, apertura, vestuario, música,
  video): subir reemplaza y borra el anterior. La galería acumula.
- **Tailwind v4**: sin `cursor: pointer` por defecto en los botones, y las
  clases de z-index altas van entre corchetes (`z-[60]`, no `z-60`).
- **Vercel**: el proxy no acepta cuerpos de más de 4,5 MB, así que los archivos
  grandes hay que comprimirlos antes de subirlos por el panel.

## Los secretos

`api/.env.local` (fuera del repositorio) tiene los valores reales;
`api/env.example` es la plantilla y va vacía. En producción son
`fly secrets` y las variables del panel de Vercel.

## Lo demás

`README.md` explica las decisiones de arquitectura y qué queda pendiente.
`DEPLOY.md` es el paso a paso del despliegue y la lista de errores ya vistos
con su causa.
