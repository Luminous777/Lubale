import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { MembershipRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembershipForUser } from "@/lib/authz";
import { extForMime, sniffImageMime, UPLOAD_MAX_BYTES } from "@/lib/uploads";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("No autenticado", 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Cuerpo inválido", 400);
  }

  const kind = String(form.get("kind") ?? "");
  const orgSlugParam = String(form.get("orgSlug") ?? "").trim();
  const profileIdRaw = String(form.get("profileId") ?? "").trim();
  const file = form.get("file");

  if (!orgSlugParam) return jsonError("Falta orgSlug", 400);
  if (
    kind !== "org-logo" &&
    kind !== "org-card-bg" &&
    kind !== "profile-photo" &&
    kind !== "profile-card-bg"
  ) {
    return jsonError("Tipo de subida inválido", 400);
  }
  if (!(file instanceof File)) return jsonError("Falta archivo", 400);
  if (file.size === 0) return jsonError("Archivo vacío", 400);
  if (file.size > UPLOAD_MAX_BYTES) return jsonError("La imagen supera el máximo de 2 MB", 400);

  const row = await getMembershipForUser(orgSlugParam, session.user.id);
  if (!row || row.membership.status !== "active") return jsonError("Sin acceso a la organización", 403);

  const org = row.org;
  const subfolder =
    kind === "org-logo"
      ? "logos"
      : kind === "org-card-bg" || kind === "profile-card-bg"
        ? "card-bg"
        : "photos";

  if (kind === "org-logo" || kind === "org-card-bg") {
    if (row.membership.role !== MembershipRole.admin) {
      return jsonError(
        kind === "org-logo"
          ? "Solo administradores pueden subir el logo"
          : "Solo administradores pueden subir el fondo de marca",
        403,
      );
    }
  } else if (kind === "profile-card-bg") {
    if (profileIdRaw) {
      const profile = await prisma.profile.findFirst({
        where: { id: profileIdRaw, organizationId: org.id },
      });
      if (!profile) return jsonError("Tarjeta no encontrada", 404);
      const isAdmin = row.membership.role === MembershipRole.admin;
      const isOwner = profile.ownerUserId === session.user.id;
      const unassigned = profile.ownerUserId === null;
      if (!isAdmin && !isOwner && !unassigned) return jsonError("Sin permiso para el fondo de esta tarjeta", 403);
    } else {
      if (row.membership.role !== MembershipRole.admin) {
        return jsonError("Solo administradores pueden subir el fondo al crear una tarjeta", 403);
      }
    }
  } else {
    if (profileIdRaw) {
      const profile = await prisma.profile.findFirst({
        where: { id: profileIdRaw, organizationId: org.id },
      });
      if (!profile) return jsonError("Tarjeta no encontrada", 404);
      const isAdmin = row.membership.role === MembershipRole.admin;
      const isOwner = profile.ownerUserId === session.user.id;
      const unassigned = profile.ownerUserId === null;
      if (!isAdmin && !isOwner && !unassigned) return jsonError("Sin permiso para esta foto", 403);
    } else {
      if (row.membership.role !== MembershipRole.admin) {
        return jsonError("Solo administradores pueden subir la foto al crear una tarjeta", 403);
      }
    }
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageMime(buf);
  if (!mime) return jsonError("Formato no permitido (usa JPG, PNG, WebP o GIF)", 400);

  const ext = extForMime(mime);
  const id = randomBytes(16).toString("hex");
  const filename = `${id}${ext}`;
  const absoluteDir = path.join(process.cwd(), "public", "uploads", org.slug, subfolder);
  const absoluteFile = path.join(absoluteDir, filename);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absoluteFile, buf);

  const publicUrl = `/uploads/${org.slug}/${subfolder}/${filename}`;
  return NextResponse.json({ url: publicUrl });
}
