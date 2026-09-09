/**
 * Slugs reservados a nivel raíz: estas rutas son páginas estáticas o de la app y
 * no pueden ser usadas como `Organization.slug` (handle público o slug de empresa).
 *
 * En Next.js las rutas estáticas tienen prioridad sobre `[handle]/page.tsx`, así
 * que la página seguiría funcionando aunque alguien tomara el slug, pero la URL
 * pública del particular quedaría rota. Por eso lo bloqueamos en el alta.
 */
export const RESERVED_HANDLES = new Set<string>([
  "api",
  "card",
  "dashboard",
  "favicon.ico",
  "invite",
  "login",
  "logout",
  "onboarding",
  "precios",
  "pricing",
  "register",
  "signup",
  "theme-preview",
  "uploads",
  "vcard",
  "_next",
  "robots.txt",
  "sitemap.xml",
  "admin",
  "settings",
  "billing",
  "team",
  "cards",
  "openapi.yaml",
  "crear",
  "enviado",
  "entrar",
  "magic-link-sent",
]);

/** Devuelve `null` si es válido o un mensaje de error en español. */
export function validateHandle(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (!t) return "Elegí un identificador.";
  if (t.length < 3) return "El identificador debe tener al menos 3 caracteres.";
  if (t.length > 32) return "El identificador es demasiado largo (máx. 32).";
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(t)) {
    return "Usá solo letras minúsculas, números y guiones (sin empezar/terminar con guion).";
  }
  if (RESERVED_HANDLES.has(t)) {
    return "Ese identificador está reservado, elegí otro.";
  }
  return null;
}
