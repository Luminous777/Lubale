import { OrganizationKind } from "@prisma/client";
import { ProfileLinkKind } from "@/lib/profileLinkKinds";
import { prisma } from "@/lib/prisma";
import { getPlanFeatures } from "@/lib/plan";

export async function getPublicProfile(orgSlug: string, cardSlug: string) {
  return prisma.profile.findFirst({
    where: {
      cardSlug,
      organization: { slug: orgSlug },
    },
    include: {
      organization: true,
      links: { orderBy: { sortOrder: "asc" } },
    },
  });
}

/** Único perfil de una org personal accesible vía `/[handle]`. */
export async function getPublicProfileForHandle(handle: string) {
  const org = await prisma.organization.findUnique({
    where: { slug: handle },
    include: {
      profiles: {
        take: 1,
        orderBy: { createdAt: "asc" },
        include: { links: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!org) return null;
  if (org.kind !== OrganizationKind.personal) return null;
  const profile = org.profiles[0];
  if (!profile) return null;
  // Devolvemos la misma forma que `getPublicProfile`.
  return {
    ...profile,
    organization: org,
  };
}

/**
 * Filtra los enlaces y branding de un perfil según el plan efectivo de la org.
 * En Free se quitan: enlaces no-WhatsApp, fondo de tarjeta, logo y colores custom.
 */
export function applyPlanGatesToPublicProfile<
  P extends {
    cardBackgroundUrl: string | null;
    links: { kind: ProfileLinkKind; id: string; title: string; url: string }[];
    organization: {
      plan: import("@prisma/client").BillingPlan;
      currentPeriodEnd: Date | null;
      inTrial: boolean;
      seats: number;
      kind: OrganizationKind;
      logoUrl: string | null;
      cardBackgroundUrl: string | null;
      primaryColor: string;
      secondaryColor: string | null;
    };
  },
>(profile: P): P {
  const features = getPlanFeatures(profile.organization);
  if (features.aiEnabled && features.customBrandingEnabled) {
    // Plan pago: respetamos todo tal cual.
    return profile;
  }
  // Plan Free → poda.
  return {
    ...profile,
    cardBackgroundUrl: features.cardBackgroundEnabled ? profile.cardBackgroundUrl : null,
    links: features.onlyWhatsappLinks
      ? profile.links.filter((l) => l.kind === ProfileLinkKind.whatsapp).slice(0, features.maxLinks)
      : profile.links,
    organization: {
      ...profile.organization,
      logoUrl: features.customBrandingEnabled ? profile.organization.logoUrl : null,
      cardBackgroundUrl: features.customBrandingEnabled
        ? profile.organization.cardBackgroundUrl
        : null,
      // En Free dejamos el primary por default (azul) y sin secundario.
      primaryColor: features.customBrandingEnabled ? profile.organization.primaryColor : "#3f67c4",
      secondaryColor: features.customBrandingEnabled ? profile.organization.secondaryColor : null,
    },
  };
}
