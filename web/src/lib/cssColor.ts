/** Acento por defecto (cobalto): tarjeta pública / vista previa Marca / fallbacks. */
export const DEFAULT_ACCENT = "#3f67c4";

/** Segundo tono por defecto para degradados (armoniza con cobalto). */
export const DEFAULT_SECONDARY = "#6a8edc";

/** Evita valores peligrosos o inválidos en atributos `style`. */
export function sanitizeCssColor(
  input: string | null | undefined,
  fallback: string = DEFAULT_ACCENT,
): string {
  const t = (input ?? "").trim().slice(0, 64);
  if (!t) return fallback;
  if (/[;{}]|url\s*\(/i.test(t)) return fallback;
  if (/^#[0-9A-Fa-f]{3,8}$/.test(t)) return t;
  if (/^rgba?\(\s*[\d\s%,.]+\)$/i.test(t)) return t;
  if (/^hsla?\(\s*[\d\s%,.]+\)$/i.test(t)) return t;
  return fallback;
}
