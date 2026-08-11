import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export type AiImageSubfolder = "photos" | "card-bg" | "logos";

/**
 * Guarda una imagen generada por IA (base64 PNG) en `public/uploads/{orgSlug}/{subfolder}/`
 * usando el mismo formato de nombres que `/api/upload/image` para que pase la validación
 * de `isPublicUploadImageUrl` en los server actions de perfil/org.
 */
export async function saveAiImage(input: {
  orgSlug: string;
  subfolder: AiImageSubfolder;
  base64: string;
  /** Por defecto .png (gpt-image-1 devuelve PNG). */
  ext?: ".png" | ".jpg" | ".webp";
}): Promise<string> {
  const ext = input.ext ?? ".png";
  const id = randomBytes(16).toString("hex");
  const filename = `${id}${ext}`;
  const absoluteDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    input.orgSlug,
    input.subfolder,
  );
  const absoluteFile = path.join(absoluteDir, filename);

  const buf = Buffer.from(input.base64, "base64");
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absoluteFile, buf);

  return `/uploads/${input.orgSlug}/${input.subfolder}/${filename}`;
}

/** Convierte un File a data URL (`data:image/png;base64,...`) para enviarlo a la visión de OpenAI. */
export async function fileToDataUrl(file: File): Promise<string> {
  const arr = new Uint8Array(await file.arrayBuffer());
  const base64 = Buffer.from(arr).toString("base64");
  const type = file.type || "image/png";
  return `data:${type};base64,${base64}`;
}
