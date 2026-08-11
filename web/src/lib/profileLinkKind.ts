import { ProfileLinkKind } from "@/lib/profileLinkKinds";

/** Detecta a qué categoría pertenece una URL libre (sin tocar la DB). */
export function detectProfileLinkKind(rawUrl: string): ProfileLinkKind {
  const url = rawUrl.trim().toLowerCase();
  if (!url) return ProfileLinkKind.other;
  if (
    url.includes("wa.me/") ||
    url.startsWith("whatsapp://") ||
    url.includes("api.whatsapp.com") ||
    url.includes("whatsapp.com")
  ) {
    return ProfileLinkKind.whatsapp;
  }
  if (url.startsWith("mailto:")) return ProfileLinkKind.email;
  if (url.startsWith("tel:")) return ProfileLinkKind.phone;
  const socialHosts = [
    "instagram.com",
    "facebook.com",
    "linkedin.com",
    "twitter.com",
    "x.com",
    "tiktok.com",
    "youtube.com",
    "threads.net",
    "github.com",
  ];
  for (const h of socialHosts) {
    if (url.includes(h)) return ProfileLinkKind.social;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return ProfileLinkKind.web;
  }
  return ProfileLinkKind.other;
}
