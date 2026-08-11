import { z } from "zod";
import type { ProfileLinkKind } from "@/lib/profileLinkKinds";
import { channelAriaLabel, detectChannelKind } from "@/lib/contactChannels";
import { sanitizeHttpUrl } from "@/lib/links";
import { detectProfileLinkKind } from "@/lib/profileLinkKind";

const linkSchema = z.object({
  title: z.string().min(1).max(80),
  url: z.string().min(1).max(2000),
});

export type ParsedProfileLink = {
  title: string;
  url: string;
  kind: ProfileLinkKind;
  sortOrder: number;
};

/** Parsea el JSON de enlaces del perfil (misma regla que el servidor). */
export function parseProfileLinksJson(raw: string): ParsedProfileLink[] {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: ParsedProfileLink[] = [];
    for (const row of data) {
      if (typeof row !== "object" || !row) continue;
      const rawUrl = "url" in row ? String((row as { url?: unknown }).url).trim() : "";
      const rawTitle = "title" in row ? String((row as { title?: unknown }).title).trim() : "";
      const url = sanitizeHttpUrl(rawUrl);
      if (!url) continue;
      const title = rawTitle || channelAriaLabel(detectChannelKind(url), null);
      const parsed = linkSchema.safeParse({ title, url });
      if (!parsed.success) continue;
      out.push({
        title: parsed.data.title,
        url: parsed.data.url,
        kind: detectProfileLinkKind(parsed.data.url),
        sortOrder: out.length,
      });
    }
    return out;
  } catch {
    return [];
  }
}
