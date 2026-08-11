/**
 * Construye `https://wa.me/&lt;dígitos&gt;` a partir de lo que escribe el usuario (solo número,
 * o un enlace wa.me/whatsapp que pegue por error).
 */
export function whatsappMeUrlFromInput(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  if (/wa\.me|whatsapp\.com/i.test(t)) {
    try {
      const u = new URL(t.startsWith("http") ? t : `https://${t}`);
      const first = u.pathname.split("/").filter(Boolean)[0];
      const digits = (first ?? "").replace(/\D/g, "");
      if (digits.length >= 8 && digits.length <= 15) return `https://wa.me/${digits}`;
    } catch {
      return null;
    }
    return null;
  }

  const digits = t.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}
