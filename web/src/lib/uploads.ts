/** Rutas públicas que genera `/api/upload/image` (evita `..` y rutas raras). */
export function isPublicUploadImageUrl(
  value: string,
  subfolder: "logos" | "photos" | "card-bg",
): boolean {
  const v = value.trim();
  if (!v.startsWith("/uploads/") || v.includes("..") || v.length > 400) return false;
  return new RegExp(`^/uploads/[^/]+/${subfolder}/[a-z0-9._-]+$`, "i").test(v);
}

export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function sniffImageMime(buf: Uint8Array): keyof typeof MIME_TO_EXT | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "image/png";
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "image/webp";
  return null;
}

export function extForMime(mime: keyof typeof MIME_TO_EXT): string {
  return MIME_TO_EXT[mime];
}
