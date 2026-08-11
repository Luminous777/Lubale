"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { isPublicUploadImageUrl } from "@/lib/uploads";
import { requireOrgAdmin } from "@/lib/authz";
import { validateHandle } from "@/lib/handles";
import { getPlanFeatures } from "@/lib/plan";
import {
  DeactivatedProfileBehavior,
  MembershipRole,
  MembershipStatus,
  OrganizationKind,
  BillingPlan,
} from "@prisma/client";

/** Vacío → null; subidas en `/uploads/.../card-bg/` o http(s). */
function parseOptionalCardBackgroundUrl(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  if (isPublicUploadImageUrl(t, "card-bg")) return { ok: true, value: t };
  const candidate = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "La URL del fondo debe empezar por http:// o https://." };
    }
    return { ok: true, value: candidate };
  } catch {
    return {
      ok: false,
      error: "La URL del fondo no es válida. Ejemplo: https://ejemplo.com/fondo.jpg",
    };
  }
}

/** Vacío → null; si falta esquema se prueba con https://; solo http(s). */
function parseOptionalLogoUrl(raw: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  if (isPublicUploadImageUrl(t, "logos")) return { ok: true, value: t };
  const candidate = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "La URL del logo debe empezar por http:// o https://." };
    }
    return { ok: true, value: candidate };
  } catch {
    return {
      ok: false,
      error: "La URL del logo no es válida. Ejemplo: https://ejemplo.com/logo.png",
    };
  }
}

function parseCssColor(raw: string, fieldLabel: string): { ok: true; value: string } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: false, error: `${fieldLabel} no puede estar vacío.` };
  if (t.length > 64) return { ok: false, error: `${fieldLabel} es demasiado largo (máx. 64 caracteres).` };
  return { ok: true, value: t };
}

export async function createOrganizationAction(
  _prev: unknown,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  if (!name) return { error: "Nombre requerido" };
  const slug = slugify(slugRaw || name);
  const handleErr = validateHandle(slug);
  if (handleErr) return { error: handleErr };

  const taken = await prisma.organization.findUnique({ where: { slug } });
  if (taken) return { error: "Ese identificador de empresa ya existe" };

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      kind: OrganizationKind.business,
      plan: BillingPlan.business,
      // 14 días de trial sin pago.
      inTrial: true,
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      seats: 1,
      memberships: {
        create: {
          userId: session.user.id,
          role: MembershipRole.admin,
          status: MembershipStatus.active,
        },
      },
    },
  });

  revalidatePath("/dashboard");
  return { ok: true, slug: org.slug };
}

export async function updateOrganizationBrandingAction(
  orgSlug: string,
  _prev: unknown,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const { org } = await requireOrgAdmin(orgSlug, session.user.id);
  const features = getPlanFeatures(org);
  if (!features.customBrandingEnabled) {
    return {
      error: "Tu plan actual no permite editar la marca. Mejorá a Pro o Empresa.",
    };
  }

  const logoRaw = String(formData.get("logoUrl") ?? "");
  const logo = parseOptionalLogoUrl(logoRaw);
  if (!logo.ok) return { error: logo.error };

  const cardBgRaw = String(formData.get("cardBackgroundUrl") ?? "");
  const cardBg = parseOptionalCardBackgroundUrl(cardBgRaw);
  if (!cardBg.ok) return { error: cardBg.error };

  const primary = parseCssColor(String(formData.get("primaryColor") ?? ""), "Color primario");
  if (!primary.ok) return { error: primary.error };

  const secondaryRaw = String(formData.get("secondaryColor") ?? "").trim();
  let secondaryColor: string | null = null;
  if (secondaryRaw) {
    const sec = parseCssColor(secondaryRaw, "Color secundario");
    if (!sec.ok) return { error: sec.error };
    secondaryColor = sec.value;
  }

  const behaviorParsed = z.enum(["gone", "message"]).safeParse(
    String(formData.get("deactivatedBehavior") ?? "gone"),
  );
  if (!behaviorParsed.success) return { error: "Opción de perfil desactivado no válida." };

  await prisma.organization.update({
    where: { slug: orgSlug },
    data: {
      logoUrl: logo.value,
      cardBackgroundUrl: cardBg.value,
      primaryColor: primary.value,
      secondaryColor,
      deactivatedBehavior:
        behaviorParsed.data === "message"
          ? DeactivatedProfileBehavior.message
          : DeactivatedProfileBehavior.gone,
    },
  });

  const cards = await prisma.profile.findMany({
    where: { organization: { slug: orgSlug } },
    select: { cardSlug: true },
  });
  for (const { cardSlug } of cards) {
    revalidatePath(`/card/${orgSlug}/${cardSlug}`);
  }

  revalidatePath(`/dashboard/${orgSlug}/settings`);
  revalidatePath(`/dashboard/${orgSlug}`);
  return { ok: true };
}

export type BrandingFormState = { error?: string } | undefined;

/** Para `useActionState`: devuelve el error en pantalla o redirige si todo va bien. */
export async function updateBrandingFormAction(
  orgSlug: string,
  _prev: BrandingFormState,
  formData: FormData,
): Promise<BrandingFormState> {
  const res = await updateOrganizationBrandingAction(orgSlug, null, formData);
  if (res && "error" in res) return { error: res.error };
  redirect(`/dashboard/${orgSlug}/settings`);
}
