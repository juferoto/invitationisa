import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Dominio desde el que se sirven los medios en producción (el bucket de R2 o
// su CDN). En desarrollo los sirve el propio backend en localhost:8080.
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOST;

const nextConfig: NextConfig = {
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
