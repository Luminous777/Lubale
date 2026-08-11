"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { parseProfileLinksJson } from "@/lib/profileLinksJson";
import { isPublicUploadImageUrl } from "@/lib/uploads";
import { canUserEditProfile, requireOrgAccess, requireOrgAdmin } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getPlanFeatures } from "@/lib/plan";
import { ProfileLinkKind, ProfileStatus } from "@prisma/client";

/** Aplica el cap de plan a la lista de enlaces antes de persistirlos. */
function enforceLinksByPlan(
  links: ReturnType<typeof parseProfileLinksJson>,
  features: ReturnType<typeof getPlanFeatures>,
): ReturnType<typeof parseProfileLinksJson> {
  let filtered = links;
  if (features.onlyWhatsappLinks) {
    filtered = filtered.filter((l) => l.kind === ProfileLinkKind.whatsapp);
  }
  if (Number.isFinite(features.maxLinks)) {
    filtered = filtered.slice(0, features.maxLinks);
  }
  return filtered.map((l, i) => ({ ...l, sortOrder: i }));
}

const emptyToUndefined = (v: unknown) => {
  if (v == null) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
};

const profileBaseSchema = z.object({
  displayName: z.string().min(1).max(120),
  title: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  bio: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
  emailPublic: z.preprocess(emptyToUndefined, z.string().email().optional()),
  photoUrl: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(
        (s) => z.string().url().safeParse(s).success || isPublicUploadImageUrl(s, "photos"),
        "URL de foto inválida",
      )
      .optional(),
  ),
  cardBackgroundUrl: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(
        (s) =>
          z.string().url().safeParse(s).success || isPublicUploadImageUrl(s, "card-bg"),
        "URL de fondo inválida",
      )
      .optional(),
  ),
});

export async function createProfileAction(
  orgSlug: string,
  _prev: unknown,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const { org } = await requireOrgAdmin(orgSlug, session.user.id);

  // Cap de asientos / perfiles según plan.
  const features = getPlanFeatures(org);
  const currentCount = await prisma.profile.count({ where: { organizationId: org.id } });
  if (currentCount >= features.maxProfiles) {
    return {
      error: `Tu plan permite ${features.maxProfiles} ${features.maxProfiles === 1 ? "tarjeta" : "tarjetas"} activas. Mejorá el plan o sumá asientos para crear más.`,
    };
  }

  const cardSlug = slugify(String(formData.get("cardSlug") ?? ""));
  if (!cardSlug) return { error: "Slug de tarjeta inválido" };

  const exists = await prisma.profile.findUnique({
    where: {
      organizationId_cardSlug: { organizationId: org.id, cardSlug },
    },
  });
  if (exists) return { error: "Ese slug de tarjeta ya existe en la empresa" };

  const base = profileBaseSchema.safeParse({
    displayName: formData.get("displayName"),
    title: formData.get("title"),
    bio: formData.get("bio"),
    phone: formData.get("phone"),
    emailPublic: formData.get("emailPublic"),
    photoUrl: formData.get("photoUrl"),
    cardBackgroundUrl: formData.get("cardBackgroundUrl"),
  });
  if (!base.success) {
    const hint = base.error.issues[0]?.message;
    return { error: hint ? `Revisa los datos: ${hint}` : "Datos del perfil inválidos" };
  }

  const allLinks = parseProfileLinksJson(String(formData.get("linksJson") ?? "[]"));
  const links = enforceLinksByPlan(allLinks, features);

  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  let ownerUserId: string | null = null;
  if (ownerEmail) {
    const u = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (!u) return { error: "El usuario propietario no existe aún (invítalo primero)" };
    const m = await prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId: org.id, userId: u.id },
      },
    });
    if (!m || m.status !== "active") {
      return { error: "Ese usuario no pertenece activamente a la empresa" };
    }
    ownerUserId = u.id;
  }

  await prisma.profile.create({
    data: {
      organizationId: org.id,
      cardSlug,
      ownerUserId,
      displayName: base.data.displayName,
      title: base.data.title || null,
      bio: base.data.bio || null,
      phone: base.data.phone || null,
      emailPublic: base.data.emailPublic || null,
      photoUrl: base.data.photoUrl || null,
      cardBackgroundUrl: features.cardBackgroundEnabled ? base.data.cardBackgroundUrl || null : null,
      links: { create: links },
    },
  });

  revalidatePath(`/dashboard/${orgSlug}/cards`);
  return { ok: true };
}

export async function updateProfileAction(
  orgSlug: string,
  profileId: string,
  _prev: unknown,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const { org, membership } = await requireOrgAccess(orgSlug, session.user.id);
  const features = getPlanFeatures(org);

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, organizationId: org.id },
  });
  if (!profile) return { error: "Perfil no encontrado" };

  if (
    !canUserEditProfile({
      membership,
      profileOwnerUserId: profile.ownerUserId,
      userId: session.user.id,
    })
  ) {
    return { error: "Sin permiso para editar" };
  }

  const base = profileBaseSchema.safeParse({
    displayName: formData.get("displayName"),
    title: formData.get("title"),
    bio: formData.get("bio"),
    phone: formData.has("phone") ? formData.get("phone") : (profile.phone ?? ""),
    emailPublic: formData.has("emailPublic")
      ? formData.get("emailPublic")
      : (profile.emailPublic ?? ""),
    photoUrl: formData.get("photoUrl"),
    cardBackgroundUrl: formData.get("cardBackgroundUrl"),
  });
  if (!base.success) {
    const hint = base.error.issues[0]?.message;
    return { error: hint ? `Revisa los datos: ${hint}` : "Datos del perfil inválidos" };
  }

  const allLinks = parseProfileLinksJson(String(formData.get("linksJson") ?? "[]"));
  const links = enforceLinksByPlan(allLinks, features);

  await prisma.$transaction(async (tx) => {
    await tx.profileLink.deleteMany({ where: { profileId } });
    await tx.profile.update({
      where: { id: profileId },
      data: {
        displayName: base.data.displayName,
        title: base.data.title || null,
        bio: base.data.bio || null,
        phone: base.data.phone || null,
        emailPublic: base.data.emailPublic || null,
        photoUrl: base.data.photoUrl || null,
        cardBackgroundUrl: features.cardBackgroundEnabled
          ? base.data.cardBackgroundUrl || null
          : null,
        links: { create: links },
      },
    });
  });

  revalidatePath(`/dashboard/${orgSlug}/cards`);
  revalidatePath(`/card/${orgSlug}/${profile.cardSlug}`);
  return { ok: true };
}

export async function deactivateProfileAction(orgSlug: string, profileId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const { org } = await requireOrgAdmin(orgSlug, session.user.id);

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, organizationId: org.id },
  });
  if (!profile) return { error: "Perfil no encontrado" };

  await prisma.profile.update({
    where: { id: profileId },
    data: { status: ProfileStatus.disabled },
  });

  await logAudit({
    organizationId: org.id,
    actorUserId: session.user.id,
    action: "profile.deactivate",
    payload: { profileId, cardSlug: profile.cardSlug },
  });

  revalidatePath(`/dashboard/${orgSlug}/cards`);
  revalidatePath(`/card/${orgSlug}/${profile.cardSlug}`);
  return { ok: true };
}

export async function activateProfileAction(orgSlug: string, profileId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const { org } = await requireOrgAdmin(orgSlug, session.user.id);

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, organizationId: org.id },
  });
  if (!profile) return { error: "Perfil no encontrado" };

  await prisma.profile.update({
    where: { id: profileId },
    data: { status: ProfileStatus.active },
  });

  await logAudit({
    organizationId: org.id,
    actorUserId: session.user.id,
    action: "profile.activate",
    payload: { profileId, cardSlug: profile.cardSlug },
  });

  revalidatePath(`/dashboard/${orgSlug}/cards`);
  revalidatePath(`/card/${orgSlug}/${profile.cardSlug}`);
  return { ok: true };
}

export async function reassignProfileOwnerAction(
  orgSlug: string,
  profileId: string,
  newOwnerEmail: string,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const { org } = await requireOrgAdmin(orgSlug, session.user.id);

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, organizationId: org.id },
  });
  if (!profile) return { error: "Perfil no encontrado" };

  const email = newOwnerEmail.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "Usuario no encontrado" };

  const m = await prisma.membership.findUnique({
    where: {
      organizationId_userId: { organizationId: org.id, userId: user.id },
    },
  });
  if (!m || m.status !== "active") {
    return { error: "El nuevo propietario debe ser miembro activo" };
  }

  await prisma.profile.update({
    where: { id: profileId },
    data: { ownerUserId: user.id },
  });

  await logAudit({
    organizationId: org.id,
    actorUserId: session.user.id,
    action: "profile.reassign_owner",
    payload: { profileId, cardSlug: profile.cardSlug, newOwnerEmail: email },
  });

  revalidatePath(`/dashboard/${orgSlug}/cards`);
  revalidatePath(`/card/${orgSlug}/${profile.cardSlug}`);
  return { ok: true };
}

export type CreateProfileFormState = { error?: string } | undefined;

/** Para `useActionState` en “Nueva tarjeta”: error visible o redirección al listado. */
export async function createProfileFormAction(
  orgSlug: string,
  _prev: CreateProfileFormState,
  formData: FormData,
): Promise<CreateProfileFormState> {
  const res = await createProfileAction(orgSlug, null, formData);
  if (res && "error" in res) return { error: res.error };
  redirect(`/dashboard/${orgSlug}/cards`);
}

export type UpdateProfileFormState = { error?: string } | undefined;

export async function updateProfileFormAction(
  orgSlug: string,
  profileId: string,
  _prev: UpdateProfileFormState,
  formData: FormData,
): Promise<UpdateProfileFormState> {
  const res = await updateProfileAction(orgSlug, profileId, null, formData);
  if (res && "error" in res) return { error: res.error };
  redirect(`/dashboard/${orgSlug}/cards`);
}

export type ReassignOwnerFormState = { error?: string } | undefined;

export async function reassignProfileOwnerFormAction(
  orgSlug: string,
  profileId: string,
  _prev: ReassignOwnerFormState,
  formData: FormData,
): Promise<ReassignOwnerFormState> {
  const email = String(formData.get("newOwnerEmail") ?? "");
  const res = await reassignProfileOwnerAction(orgSlug, profileId, email);
  if (res && "error" in res) return { error: res.error };
  redirect(`/dashboard/${orgSlug}/cards/${profileId}/edit`);
}

export async function deactivateProfileForm(
  orgSlug: string,
  profileId: string,
): Promise<void> {
  const res = await deactivateProfileAction(orgSlug, profileId);
  if (res && "error" in res) throw new Error(res.error);
  redirect(`/dashboard/${orgSlug}/cards`);
}

export async function activateProfileForm(
  orgSlug: string,
  profileId: string,
): Promise<void> {
  const res = await activateProfileAction(orgSlug, profileId);
  if (res && "error" in res) throw new Error(res.error);
  redirect(`/dashboard/${orgSlug}/cards`);
}
