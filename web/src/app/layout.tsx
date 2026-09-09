import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-serif",
});
const sans = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Lubela — Tarjetas digitales para empresas",
    template: "%s · Lubela",
  },
  description:
    "Tarjetas digitales con QR para equipos y empresas. Cada persona con su link, vos controlás la marca desde un panel.",
  metadataBase: new URL("https://lubela.app"),
  openGraph: {
    siteName: "Lubela",
    type: "website",
    locale: "es_AR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable}`}>
      <body className="font-sans text-navy antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
