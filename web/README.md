# Web de invitaciones

Frontend en Next.js. Contiene la invitación pública y el panel.

Se despliega en Vercel con **Root Directory: `web`**; el paso a paso está en el
[`DEPLOY.md`](../DEPLOY.md) de la raíz. Esta carpeta es autocontenida y puede
extraerse a su propio repositorio moviéndola tal cual: lo único que la une a
la API son dos variables de entorno.

```bash
npm install
npm run dev             # :3000
```

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_API_URL` | Dónde vive la API |
| `NEXT_PUBLIC_MEDIA_HOST` | Dominio que `next/image` puede optimizar |

- `src/app/i/[token]` — la invitación, renderizada en servidor
- `src/app/admin` — el panel; `(panel)` agrupa lo que exige sesión
- `src/components/invitation` — sobre, galería, iconos, cuenta regresiva
- `src/components/admin` — formularios y diálogos del panel
