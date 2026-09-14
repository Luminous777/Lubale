/**
 * URL pública base de la app, usada para construir enlaces en emails
 * (magic link, restablecer contraseña, invitaciones).
 *
 * Prioridad: APP_BASE_URL explícita → URL de deploy de Vercel → dominio de
 * producción por defecto. Nunca incluye barra final.
 */
export function getBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "https://lubela.app";
}
