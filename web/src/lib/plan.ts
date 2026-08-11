import {
  AiQuotaScope,
  BillingPlan,
  MembershipRole,
  OrganizationKind,
  type Organization,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PRICES_ARS_CENTS } from "@/lib/planConstants";

/* -------------------------------------------------------------------------- */
/*  Precios (re-exportados desde un módulo puro para que también lo use el cliente) */
/* -------------------------------------------------------------------------- */

export {
  ANNUAL_TRANSFER_DISCOUNT,
  EMPRESA_MIN_SEATS_AT_PACK,
  PRICES_ARS_CENTS,
  priceAnnualTransferCents,
} from "@/lib/planConstants";

/* -------------------------------------------------------------------------- */
/*  Cupos de IA por plan                                                      */
/* -------------------------------------------------------------------------- */

export type AiQuotaLimits = { images: number; texts: number };

const ZERO: AiQuotaLimits = { images: 0, texts: 0 };

/** Devuelve el cupo mensual para un (plan, scope). 0/0 = no permitido. */
export function aiQuotaLimitsFor(
  plan: BillingPlan,
  scope: AiQuotaScope,
): AiQuotaLimits {
  if (plan === BillingPlan.free) return ZERO;
  if (plan === BillingPlan.pro) {
    return scope === AiQuotaScope.personal ? { images: 4, texts: 4 } : ZERO;
  }
  if (plan === BillingPlan.business) {
    if (scope === AiQuotaScope.member_card) return { images: 6, texts: 6 };
    if (scope === AiQuotaScope.org_branding) return { images: 6, texts: 6 };
    return ZERO;
  }
  return ZERO;
}

/* -------------------------------------------------------------------------- */
/*  Feature flags por org                                                     */
/* -------------------------------------------------------------------------- */

export type PlanFeatures = {
  /** Se puede usar la IA (texto o imagen). */
  aiEnabled: boolean;
  /** Se permite editar branding (logo, colores, fondo de marca). */
  customBrandingEnabled: boolean;
  /** Se permite usar fondo de tarjeta a nivel perfil. */
  cardBackgroundEnabled: boolean;
  /** Cuántos enlaces como máximo (Infinity = ilimitado). */
  maxLinks: number;
  /** Si solo se permiten enlaces tipo WhatsApp (Free). */
  onlyWhatsappLinks: boolean;
  /** Cuántos perfiles puede tener la org. */
  maxProfiles: number;
};

/** Devuelve el plan "efectivo" tomando en cuenta vencimiento. */
export function effectivePlan(org: Pick<Organization, "plan" | "currentPeriodEnd" | "inTrial">): BillingPlan {
  if (org.plan === BillingPlan.free) return BillingPlan.free;
  const now = Date.now();
  const end = org.currentPeriodEnd ? org.currentPeriodEnd.getTime() : 0;
  if (org.inTrial && end > now) return org.plan;
  if (end > now) return org.plan;
  return BillingPlan.free;
}

/** Calcula features visibles a partir del plan efectivo y los asientos. */
export function getPlanFeatures(
  org: Pick<Organization, "plan" | "currentPeriodEnd" | "inTrial" | "seats" | "kind">,
): PlanFeatures {
  const plan = effectivePlan(org);
  if (plan === BillingPlan.free) {
    return {
      aiEnabled: false,
      customBrandingEnabled: false,
      cardBackgroundEnabled: false,
      maxLinks: 1,
      onlyWhatsappLinks: true,
      maxProfiles: 1,
    };
  }
  if (plan === BillingPlan.pro) {
    return {
      aiEnabled: true,
      customBrandingEnabled: true,
      cardBackgroundEnabled: true,
      maxLinks: Number.POSITIVE_INFINITY,
      onlyWhatsappLinks: false,
      maxProfiles: 1,
    };
  }
  return {
    aiEnabled: true,
    customBrandingEnabled: true,
    cardBackgroundEnabled: true,
    maxLinks: Number.POSITIVE_INFINITY,
    onlyWhatsappLinks: false,
    maxProfiles: org.seats,
  };
}

/* -------------------------------------------------------------------------- */
/*  Cuotas de IA: lectura y consumo                                           */
/* -------------------------------------------------------------------------- */

/** Inicio del mes UTC para "ahora" o una fecha dada. */
export function periodStartFor(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export type AiQuotaSnapshot = {
  scope: AiQuotaScope;
  limit: AiQuotaLimits;
  used: { images: number; texts: number };
  remaining: { images: number; texts: number };
  periodStart: Date;
};

/** Lee el contador actual del período. No lo crea si no existe. */
export async function readAiQuota(input: {
  organizationId: string;
  userId: string | null;
  scope: AiQuotaScope;
  plan: BillingPlan;
}): Promise<AiQuotaSnapshot> {
  const periodStart = periodStartFor();
  const limit = aiQuotaLimitsFor(input.plan, input.scope);
  const row = await prisma.aiQuotaUsage.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
      scope: input.scope,
      periodStart,
    },
  });
  const used = {
    images: row?.imagesUsed ?? 0,
    texts: row?.textsUsed ?? 0,
  };
  return {
    scope: input.scope,
    limit,
    used,
    remaining: {
      images: Math.max(0, limit.images - used.images),
      texts: Math.max(0, limit.texts - used.texts),
    },
    periodStart,
  };
}

/**
 * Pre-chequea si se puede consumir y devuelve el snapshot. Tira `Error` con mensaje
 * legible si el plan no permite IA o si excede el cupo. NO incrementa todavía.
 */
export async function assertCanConsumeAi(input: {
  org: Pick<Organization, "id" | "plan" | "currentPeriodEnd" | "inTrial" | "seats" | "kind">;
  userId: string | null;
  scope: AiQuotaScope;
  images: number;
  texts: number;
}): Promise<AiQuotaSnapshot> {
  const features = getPlanFeatures(input.org);
  if (!features.aiEnabled) {
    throw new Error("Tu plan actual no incluye IA. Mejorá a Pro o Empresa.");
  }
  const plan = effectivePlan(input.org);
  const snap = await readAiQuota({
    organizationId: input.org.id,
    userId: input.userId,
    scope: input.scope,
    plan,
  });
  if (input.images > snap.remaining.images) {
    throw new Error(
      `Sin cupo de imágenes este mes (te quedan ${snap.remaining.images}). Reseteo el día 1°.`,
    );
  }
  if (input.texts > snap.remaining.texts) {
    throw new Error(
      `Sin cupo de textos este mes (te quedan ${snap.remaining.texts}). Reseteo el día 1°.`,
    );
  }
  return snap;
}

/**
 * Incrementa el uso después de una generación exitosa. Crea la fila si es la primera
 * del período. Idempotente sobre la unique key `(org, user, scope, periodStart)`.
 */
export async function consumeAiQuota(input: {
  organizationId: string;
  userId: string | null;
  scope: AiQuotaScope;
  images: number;
  texts: number;
}): Promise<void> {
  const periodStart = periodStartFor();
  // Patrón "find + update / create" porque la unique compound contiene `userId` nullable
  // (que en Postgres no es realmente único cuando vale NULL).
  const existing = await prisma.aiQuotaUsage.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
      scope: input.scope,
      periodStart,
    },
    select: { id: true },
  });
  if (existing) {
    await prisma.aiQuotaUsage.update({
      where: { id: existing.id },
      data: {
        imagesUsed: { increment: input.images },
        textsUsed: { increment: input.texts },
      },
    });
    return;
  }
  await prisma.aiQuotaUsage.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      scope: input.scope,
      periodStart,
      imagesUsed: input.images,
      textsUsed: input.texts,
    },
  });
}

/**
 * Para una org y usuario dados, decide qué scope de cupo usar para "tarjeta":
 * - Org personal → scope = personal (cupo único del admin/dueño).
 * - Org business → scope = member_card (cupo por empleado).
 */
export function aiCardScopeFor(
  org: Pick<Organization, "kind">,
): AiQuotaScope {
  return org.kind === OrganizationKind.personal
    ? AiQuotaScope.personal
    : AiQuotaScope.member_card;
}

/** Para "marca": en personal va al mismo balde que tarjeta; en business al balde de marca. */
export function aiBrandingScopeFor(
  org: Pick<Organization, "kind">,
): AiQuotaScope {
  return org.kind === OrganizationKind.personal
    ? AiQuotaScope.personal
    : AiQuotaScope.org_branding;
}

/** En personal, el `userId` del cupo es el admin (único). En business, varía. */
export function aiQuotaUserIdFor(input: {
  org: Pick<Organization, "kind">;
  scope: AiQuotaScope;
  /** Usuario que está generando ahora (para member_card). */
  actorUserId: string;
}): string | null {
  if (input.scope === AiQuotaScope.org_branding) return null;
  return input.actorUserId;
}

/* -------------------------------------------------------------------------- */
/*  Helpers de roles para empleado-extra                                      */
/* -------------------------------------------------------------------------- */

/**
 * Devuelve true si el usuario tiene una membresía activa en alguna empresa
 * (=> califica para tarifa preferencial $1.099).
 */
export async function userHasActiveBusinessMembership(userId: string): Promise<boolean> {
  const count = await prisma.membership.count({
    where: {
      userId,
      status: "active",
      organization: {
        kind: OrganizationKind.business,
        plan: BillingPlan.business,
      },
    },
  });
  return count > 0;
}

/** Precio mensual aplicable al plan personal según si el usuario es empleado o no. */
export async function personalPriceCents(userId: string): Promise<number> {
  const isEmployee = await userHasActiveBusinessMembership(userId);
  return isEmployee ? PRICES_ARS_CENTS.empleadoExtra : PRICES_ARS_CENTS.particularPro;
}

/* -------------------------------------------------------------------------- */
/*  Util roles                                                                */
/* -------------------------------------------------------------------------- */

/** Solo admins pueden generar branding (en personal el dueño siempre es admin). */
export function isAdmin(role: MembershipRole): boolean {
  return role === MembershipRole.admin;
}
