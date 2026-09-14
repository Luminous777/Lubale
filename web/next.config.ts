import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(fileURLToPath(import.meta.url));

/*
 * Cabeceras de seguridad de base (defensa en profundidad). El preview de v0
 * quita las de framing/CSP para poder renderizar dentro de su iframe; en la
 * app desplegada se aplican todas. La CSP arranca en modo Report-Only para no
 * romper el sitio en vivo: solo registra violaciones. Una vez validada en
 * producción se puede endurecer y pasar a `Content-Security-Policy`.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "form-action 'self' https:",
    ].join("; "),
  },
];

// Este proyecto es un monorepo: la raíz (app mobile) trae su propio `react`
// y `web/` trae el suyo. Turbopack podía resolver dos instancias físicas
// distintas de React, cada una con su propio dispatcher interno, lo que
// rompía el prerender del build con "Cannot read properties of null
// (reading 'useContext'/'useState')". Forzamos que React resuelva SIEMPRE a
// la copia de `web/node_modules` (rutas relativas al `root` de Turbopack)
// para tener una única instancia.
const nextConfig: NextConfig = {
  turbopack: {
    root: projectDir,
    resolveAlias: {
      react: "./node_modules/react",
      "react-dom": "./node_modules/react-dom",
      "react/jsx-runtime": "./node_modules/react/jsx-runtime",
      "react/jsx-dev-runtime": "./node_modules/react/jsx-dev-runtime",
    },
  },
  allowedDevOrigins: ["192.168.1.57"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
