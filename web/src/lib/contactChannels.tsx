import type { ReactNode } from "react";

/**
 * Canales reconocidos en la tarjeta pública (iconos).
 *
 * Para añadir una red nueva:
 * 1. Amplía el tipo `ChannelKind` con un literal nuevo (p. ej. `"discord"`).
 * 2. Añade una fila en `CHANNEL_HOST_RULES` con subcadenas del host (sin www), en minúsculas.
 * 3. Añade el `case` correspondiente en `ChannelGlyph` con el SVG.
 *
 * `mailto:` → email, `tel:` → teléfono (también si el enlace guardado usa esos esquemas).
 */

export type ChannelKind =
  | "email"
  | "phone"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "twitter"
  | "facebook"
  | "threads"
  | "linkedin"
  | "whatsapp"
  | "telegram"
  | "github"
  | "spotify"
  | "discord"
  | "twitch"
  | "web";

type Rule = { kind: Exclude<ChannelKind, "email" | "phone">; hosts: readonly string[] };

/** Orden: gana la primera coincidencia sobre el hostname normalizado. */
const CHANNEL_HOST_RULES: readonly Rule[] = [
  { kind: "instagram", hosts: ["instagram.com", "instagr.am"] },
  { kind: "youtube", hosts: ["youtube.com", "youtu.be"] },
  { kind: "tiktok", hosts: ["tiktok.com"] },
  { kind: "twitter", hosts: ["twitter.com", "x.com"] },
  { kind: "facebook", hosts: ["facebook.com", "fb.com", "messenger.com"] },
  { kind: "threads", hosts: ["threads.net"] },
  { kind: "linkedin", hosts: ["linkedin.com"] },
  { kind: "whatsapp", hosts: ["wa.me", "whatsapp.com", "api.whatsapp.com"] },
  { kind: "telegram", hosts: ["t.me", "telegram.me", "telegram.org"] },
  { kind: "github", hosts: ["github.com"] },
  { kind: "spotify", hosts: ["open.spotify.com", "spotify.com"] },
  { kind: "discord", hosts: ["discord.com", "discord.gg"] },
  { kind: "twitch", hosts: ["twitch.tv"] },
] as const;

function parseHref(href: string): URL | null {
  const t = href.trim();
  if (!t) return null;
  try {
    return new URL(t);
  } catch {
    try {
      return new URL(`https://${t}`);
    } catch {
      return null;
    }
  }
}

/** Detecta canal a partir de URL completa o `mailto:` / `tel:`. */
export function detectChannelKind(href: string): ChannelKind {
  const raw = href.trim().toLowerCase();
  if (raw.startsWith("mailto:")) return "email";
  if (raw.startsWith("tel:")) return "phone";

  const u = parseHref(href);
  if (!u) return "web";
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  for (const { kind, hosts } of CHANNEL_HOST_RULES) {
    if (hosts.some((h) => host === h || host.endsWith(`.${h}`))) return kind;
  }
  return "web";
}

const LABELS: Record<ChannelKind, string> = {
  email: "Correo electrónico",
  phone: "Teléfono",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  twitter: "X (Twitter)",
  facebook: "Facebook",
  threads: "Threads",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  github: "GitHub",
  spotify: "Spotify",
  discord: "Discord",
  twitch: "Twitch",
  web: "Enlace",
};

/** Plantilla para el selector tipo Linktree (icono + URL inicial). */
export type SocialLinkPreset = {
  id: string;
  label: string;
  glyphKind: ChannelKind;
  /** URL inicial; el usuario suele completar handle o sustituir el ejemplo. */
  insertUrl: string;
  /** Si true, se pide un número (no URL) y se genera `https://wa.me/&lt;dígitos&gt;`. */
  requiresWhatsAppNumber?: boolean;
};

export const SOCIAL_LINK_PRESETS: readonly SocialLinkPreset[] = [
  { id: "instagram", label: "Instagram", glyphKind: "instagram", insertUrl: "https://www.instagram.com/" },
  { id: "tiktok", label: "TikTok", glyphKind: "tiktok", insertUrl: "https://www.tiktok.com/@" },
  { id: "youtube", label: "YouTube", glyphKind: "youtube", insertUrl: "https://www.youtube.com/" },
  { id: "twitter", label: "X (Twitter)", glyphKind: "twitter", insertUrl: "https://x.com/" },
  {
    id: "whatsapp",
    label: "WhatsApp",
    glyphKind: "whatsapp",
    insertUrl: "",
    requiresWhatsAppNumber: true,
  },
  { id: "facebook", label: "Facebook", glyphKind: "facebook", insertUrl: "https://www.facebook.com/" },
  { id: "threads", label: "Threads", glyphKind: "threads", insertUrl: "https://www.threads.net/@" },
  { id: "linkedin", label: "LinkedIn", glyphKind: "linkedin", insertUrl: "https://www.linkedin.com/in/" },
  { id: "telegram", label: "Telegram", glyphKind: "telegram", insertUrl: "https://t.me/" },
  { id: "spotify", label: "Spotify", glyphKind: "spotify", insertUrl: "https://open.spotify.com/user/" },
  { id: "discord", label: "Discord", glyphKind: "discord", insertUrl: "https://discord.com/" },
  { id: "twitch", label: "Twitch", glyphKind: "twitch", insertUrl: "https://www.twitch.tv/" },
  { id: "github", label: "GitHub", glyphKind: "github", insertUrl: "https://github.com/" },
  { id: "email", label: "Correo electrónico", glyphKind: "email", insertUrl: "mailto:tu@correo.com" },
  { id: "phone", label: "Teléfono (enlace)", glyphKind: "phone", insertUrl: "tel:+34123456789" },
  { id: "web", label: "Sitio u otro enlace", glyphKind: "web", insertUrl: "https://" },
] as const;

/** Ids mostrados como acceso rápido bajo el perfil (estilo Linktree). */
export const SOCIAL_QUICK_BAR_IDS: readonly string[] = [
  "instagram",
  "tiktok",
  "youtube",
  "email",
  "twitter",
];

export function presetById(id: string): SocialLinkPreset | undefined {
  return SOCIAL_LINK_PRESETS.find((p) => p.id === id);
}

export function filterSocialPresets(query: string): readonly SocialLinkPreset[] {
  const q = query.trim().toLowerCase();
  if (!q) return SOCIAL_LINK_PRESETS;
  return SOCIAL_LINK_PRESETS.filter((p) => {
    const hay = `${p.label} ${p.id}`.toLowerCase();
    return hay.includes(q);
  });
}

export function channelAriaLabel(kind: ChannelKind, explicitTitle?: string | null): string {
  const t = explicitTitle?.trim();
  if (t) return t;
  return LABELS[kind];
}

function normalizeHrefKey(href: string): string {
  const t = href.trim();
  const lower = t.toLowerCase();
  if (lower.startsWith("mailto:")) {
    try {
      return new URL(lower).href;
    } catch {
      return lower;
    }
  }
  if (lower.startsWith("tel:")) {
    return `tel:${lower.slice(4).replace(/\s/g, "")}`;
  }
  try {
    return new URL(t).href.toLowerCase();
  } catch {
    try {
      return new URL(`https://${t}`).href.toLowerCase();
    } catch {
      return lower;
    }
  }
}

/** Buzón normalizado (minúsculas) para deduplicar mailto: frente a email público y otros enlaces. */
function mailtoMailboxFromHref(href: string): string | null {
  const t = href.trim();
  if (!t.toLowerCase().startsWith("mailto:")) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "mailto:") return null;
    let raw = (u.pathname || "").replace(/^\/+/, "");
    if (!raw) raw = u.searchParams.get("to")?.trim() ?? "";
    if (!raw) return null;
    const first = raw.split(",")[0].trim();
    try {
      return decodeURIComponent(first).toLowerCase();
    } catch {
      return first.toLowerCase();
    }
  } catch {
    return null;
  }
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export type PublicContactAction = {
  key: string;
  href: string;
  ariaLabel: string;
  kind: ChannelKind;
  newTab: boolean;
};

/**
 * Orden: teléfono del perfil, email del perfil, enlaces en orden.
 * Evita duplicar el mismo href (p. ej. email en perfil y enlace mailto: igual).
 */
export function buildPublicContactActions(input: {
  phone: string | null;
  emailPublic: string | null;
  /** `href`: destino real del clic (puede ser un link de tracking `/api/t/:id`).
   *  `url`: URL original del enlace, usada para detectar la red social/canal. */
  links: readonly { id: string; url: string; href?: string; title: string }[];
}): PublicContactAction[] {
  const seen = new Set<string>();
  /** Buzones mailto ya representados (perfil o enlace). */
  const seenMailboxes = new Set<string>();
  const out: PublicContactAction[] = [];

  const push = (row: Omit<PublicContactAction, "ariaLabel"> & { title?: string | null }) => {
    const k = normalizeHrefKey(row.href);
    if (seen.has(k)) return;
    seen.add(k);
    const mb = mailtoMailboxFromHref(row.href);
    if (mb) seenMailboxes.add(mb);
    out.push({
      key: row.key,
      href: row.href,
      kind: row.kind,
      newTab: row.newTab,
      ariaLabel: channelAriaLabel(row.kind, row.title ?? null),
    });
  };

  const phoneRaw = input.phone?.trim();
  if (phoneRaw) {
    const href = phoneRaw.toLowerCase().startsWith("tel:") ? phoneRaw : `tel:${phoneRaw}`;
    push({ key: "profile-phone", href, kind: "phone", newTab: false, title: null });
  }

  const emailRaw = input.emailPublic?.trim();
  const emailLower = emailRaw?.toLowerCase() ?? null;

  if (emailRaw && emailLower) {
    push({
      key: "profile-email",
      href: `mailto:${emailLower}`,
      kind: "email",
      newTab: false,
      title: null,
    });
  }

  for (const l of input.links) {
    const url = l.url.trim();
    if (!url) continue;
    const href = (l.href ?? l.url).trim();
    if (!href) continue;

    const kind = detectChannelKind(url);
    const hrefKey = normalizeHrefKey(url);

    const linkMailbox = mailtoMailboxFromHref(url);
    if (linkMailbox && seenMailboxes.has(linkMailbox)) continue;

    if (kind === "phone" && phoneRaw) {
      const linkDigits = digitsOnly(url.replace(/^tel:/i, ""));
      const profileDigits = digitsOnly(phoneRaw);
      if (linkDigits && profileDigits && linkDigits === profileDigits) continue;
    }

    if (seen.has(hrefKey)) continue;
    seen.add(hrefKey);
    if (linkMailbox) seenMailboxes.add(linkMailbox);

    const newTab = !/^mailto:/i.test(href) && !/^tel:/i.test(href);
    out.push({
      key: l.id,
      href,
      kind,
      newTab,
      ariaLabel: channelAriaLabel(kind, l.title ?? null),
    });
  }

  return out;
}

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      {children}
    </svg>
  );
}

export function ChannelGlyph({ kind, className }: { kind: ChannelKind; className?: string }) {
  const c = className ?? "h-6 w-6";
  switch (kind) {
    case "email":
      return (
        <Svg className={c}>
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
        </Svg>
      );
    case "phone":
      return (
        <Svg className={c}>
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
        </Svg>
      );
    case "instagram":
      return (
        <Svg className={c}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </Svg>
      );
    case "youtube":
      return (
        <Svg className={c}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </Svg>
      );
    case "tiktok":
      return (
        <Svg className={c}>
          <path d="M12.525.02c1.31-.02 2.61-.01 3.918-.02.08 1.53.63 2.09 2.23 2.26 1.56.18 2.87-.6 3.3-1.92.1-.31.17-.63.26-.94.78.01 1.57.02 2.36.02v3.34c-.67 0-1.34 0-2.01-.01-.2-.82-.74-1.35-1.64-1.54-.96-.2-1.79.01-2.43.7-.65.69-.82 1.57-.67 2.47.14.9.78 1.48 1.7 1.7.43.1.87.15 1.31.14.47 0 .94-.05 1.41-.1.01.89.01 1.78 0 2.67-.5.09-1.01.14-1.52.14-2.41-.01-4.22-1.75-4.22-4.17 0-.93.28-1.77.76-2.48-.01-2.27-.01-4.54-.01-6.81zm-5.27 8.58c-.61-.01-1.22-.02-1.83-.01-.01 3.44-.01 6.89-.01 10.33 1.5.01 3-.01 4.5.02.01-3.44.01-6.89.01-10.33-1.22-.01-2.45-.01-3.67-.01z" />
        </Svg>
      );
    case "twitter":
      return (
        <Svg className={c}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </Svg>
      );
    case "facebook":
      return (
        <Svg className={c}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </Svg>
      );
    case "threads":
      return (
        <svg viewBox="0 0 24 24" className={c} aria-hidden>
          <circle cx="10" cy="12" r="5.25" fill="currentColor" opacity="0.92" />
          <circle cx="14" cy="12" r="5.25" fill="currentColor" opacity="0.92" />
        </svg>
      );
    case "linkedin":
      return (
        <Svg className={c}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </Svg>
      );
    case "whatsapp":
      return (
        <Svg className={c}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </Svg>
      );
    case "telegram":
      return (
        <Svg className={c}>
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </Svg>
      );
    case "github":
      return (
        <Svg className={c}>
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </Svg>
      );
    case "spotify":
      return (
        <Svg className={c}>
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.119-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.54-1.262.24-3.24-2.101-8.159-2.7-11.939-1.471-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.601-1.141C9.36 9.26 15 9.981 18.72 12.42c.36.18.54.78.241 1.2zm.12-3.36C15.24 8.4 8.52 8.1 5.04 9.359c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.02-1.32 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </Svg>
      );
    case "discord":
      return (
        <Svg className={c}>
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </Svg>
      );
    case "twitch":
      return (
        <Svg className={c}>
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0H6zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714v9.429z" />
        </Svg>
      );
    default:
      return (
        <Svg className={c}>
          <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
        </Svg>
      );
  }
}
