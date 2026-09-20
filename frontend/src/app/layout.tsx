import type { Metadata } from "next";
import { Cardo, Gilda_Display, Great_Vibes } from "next/font/google";
import "./globals.css";

// Las tres fuentes de la invitación de referencia. Gilda Display es la
// dominante (títulos y la mayoría del texto), Great Vibes la cursiva del sobre
// y Cardo el cuerpo. Gilda Display solo existe en peso 400.
const display = Gilda_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

// Cursiva solo para el nombre en la portada: es decorativa, nunca para texto
// largo, porque a tamaño pequeño se vuelve ilegible.
const script = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
});

const body = Cardo({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Invitaciones",
  description: "Invitaciones digitales con confirmación de asistencia",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${script.variable} ${body.variable}`}>
        {children}
      </body>
    </html>
  );
}
