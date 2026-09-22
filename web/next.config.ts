import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Dominio desde el que se sirven los medios en producción (el bucket de R2 o
// su CDN). En desarrollo los sirve el propio backend en localhost:8080.
// Sin prefijo `NEXT_PUBLIC_`: esto solo se lee aquí, al construir el sitio, y
// nunca llega al navegador. Se acepta también el nombre con prefijo porque es
// el que quedó configurado en su día.
const mediaHost =
  process.env.MEDIA_HOST ?? process.env.NEXT_PUBLIC_MEDIA_HOST;

// Origen real de la API. Solo se usa en el servidor, para el reenvío.
const apiOrigin = (
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  /**
   * Reenvía /api/* a la API desde el servidor de Next.
   *
   * Sin esto el navegador habla directamente con el dominio de la API, y la
   * cookie de sesión resulta ser de terceros: Safari en iOS la bloquea y el
   * panel devuelve al login en cada petición. Al pasar por aquí, el navegador
   * solo ve su propio dominio y la cookie es de primera parte.
   *
   * El límite: el proxy de Vercel no acepta cuerpos de más de 4,5 MB, así que
   * los archivos grandes hay que subirlos con la API apuntada directamente.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      ...(isDev
        ? ([
            {
              protocol: "http",
              hostname: "localhost",
              port: "8080",
              pathname: "/media/**",
            },
          ] as const)
        : []),
      ...(mediaHost
        ? ([
            { protocol: "https", hostname: mediaHost, pathname: "/**" },
          ] as const)
        : []),
    ],
    // Next 16 bloquea que el optimizador descargue imágenes de hosts que
    // resuelven a IPs privadas (protección contra SSRF). En desarrollo el
    // backend vive en localhost, así que hay que permitirlo explícitamente.
    // En producción los medios salen de un dominio público y esto queda en
    // false, que es donde la protección realmente importa.
    dangerouslyAllowLocalIP: isDev,
  },
};

export default nextConfig;
