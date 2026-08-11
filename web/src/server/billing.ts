"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BillingCycle,
  BillingPlan,
  BillingStatus,
  MembershipRole,
  OrganizationKind,
  PaymentMethod,
} from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/authz";
import {
  createMpSubscription,
  createMpPreference,
  formatCents,
  quoteFor,
} from "@/lib/billing";
import { userHasActiveBusinessMembership } from "@/lib/plan";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function periodEndFor(cycle: BillingCycle, from: Date = new Date()): Date {
  if (cycle === BillingCycle.annual) {
    return new Date(from.getTime() + 365 * 24 * 60 * 60 * 1000);
  }
  return new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
}

function parseCycle(raw: FormDataEntryValue | null): BillingCycle {
  return raw === "annual" ? BillingCycle.annual : BillingCycle.monthly;
}

function parseMethod(raw: FormDataEntryValue | null): PaymentMethod {
  return raw === "transfer" ? PaymentMethod.transfer : PaymentMethod.card;
}

/* -------------------------------------------------------------------------- */
/*  Cambio de plan                                                            */
/* -------------------------------------------------------------------------- */

export type ChangePlanState = { error?: string; ok?: boolean; checkoutUrl?: string } | undefined;

/**
 * Acción principal para cambiar de plan / asientos / método. Genera un cobro
 * y, si MP no está configurado, deja la org en `past_due` con instrucciones.
 */
export async function changePlanAction(
  orgSlug: string,
  _prev: ChangePlanState,
  formData: FormData,
): Promise<ChangePlanState> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: "No autenticado" };
  const { org, membership } = await requireOrgAdmin(orgSlug, session.user.id);
  if (membership.role !== MembershipRole.admin) {
    return { error: "Solo el admin puede cambiar el plan." };
  }

  const targetPlanRaw = String(formData.get("plan") ?? "");
  const cycle = parseCycle(formData.get("cycle"));
  const method = parseMethod(formData.get("paymentMethod"));
  const seatsRaw = Number(formData.get("seats") ?? org.seats);
  const seats = Number.isFinite(seatsRaw) ? Math.max(1, Math.floor(seatsRaw)) : 1;

  let targetPlan: BillingPlan;
  if (targetPlanRaw === "free") targetPlan = BillingPlan.free;
  else if (targetPlanRaw === "pro") targetPlan = BillingPlan.pro;
  else if (targetPlanRaw === "business") targetPlan = BillingPlan.business;
  else return { error: "Plan no válido." };

  // Validación: empresa solo si la org es business; pro solo si es personal
  if (targetPlan === BillingPlan.business && org.kind !== OrganizationKind.business) {
    return { error: "El plan Empresa requiere un workspace de empresa." };
  }
  if (targetPlan === BillingPlan.pro && org.kind !== OrganizationKind.personal) {
    return { error: "El plan Pro es solo para cuentas personales." };
  }

  // Plan gratis: cancelamos pago, mantenemos la org pero degradamos features.
  if (targetPlan === BillingPlan.free) {
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        plan: BillingPlan.free,
        billingCycle: BillingCycle.monthly,
        paymentMethod: PaymentMethod.card,
        billingStatus: BillingStatus.canceled,
        inTrial: false,
        seats: org.kind === OrganizationKind.business ? Math.max(1, org.seats) : 1,
      },
    });
    revalidatePath(`/dashboard/${orgSlug}/billing`);
    revalidatePath(`/dashboard/${orgSlug}`);
    return { ok: true };
  }

  // Para personal: tarifa empleado-extra si tiene membresía business activa.
  const isEmployeeExtra =
    org.kind === OrganizationKind.personal
      ? await userHasActiveBusinessMembership(session.user.id)
      : false;

  const quote = quoteFor({
    plan: targetPlan,
    kind: org.kind,
    seats: org.kind === OrganizationKind.business ? seats : 1,
    cycle,
    paymentMethod: method,
    isEmployeeExtra,
  });

  const successPath = `/dashboard/${orgSlug}/billing`;
  const periodEnd = periodEndFor(quote.cycle);

  // ── Transferencia bancaria: no hay MP, dejamos pending y mostramos instrucciones ──
  if (method === PaymentMethod.transfer) {
    const externalRef = `transfer_${org.id}_${Date.now()}`;
    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: org.id },
        data: {
          plan: targetPlan,
          seats: org.kind === OrganizationKind.business ? seats : 1,
          billingCycle: quote.cycle,
          paymentMethod: PaymentMethod.transfer,
          billingStatus: BillingStatus.past_due,
          inTrial: false,
          currentPeriodEnd: periodEnd,
          mpSubscriptionId: externalRef,
        },
      });
      await tx.billingInvoice.create({
        data: {
          organizationId: org.id,
          amountCents: quote.amountCents,
          currency: "ARS",
          paymentMethod: PaymentMethod.transfer,
          externalRef,
          periodStart: new Date(),
          periodEnd: periodEnd,
          notes: `${quote.description} — ${formatCents(quote.amountCents)} — PENDIENTE TRANSFERENCIA`,
        },
      });
    });
    revalidatePath(`/dashboard/${orgSlug}/billing`);
    return { ok: true, checkoutUrl: `${successPath}?status=pending&ref=${externalRef}` };
  }

  // ── Particulares con tarjeta → suscripción recurrente MP ──
  // ── Empresas con tarjeta → pago único Checkout Pro ──
  let mpResult: { ok: true; checkoutUrl: string; externalRef: string } | { ok: false; error: string };

  if (org.kind === OrganizationKind.personal) {
    mpResult = await createMpSubscription({
      orgId: org.id,
      amountCents: quote.amountCents,
      cycle: quote.cycle,
      description: quote.description,
      payerEmail: session.user.email,
      successPath,
    });
  } else {
    mpResult = await createMpPreference({
      orgId: org.id,
      amountCents: quote.amountCents,
      description: quote.description,
      payerEmail: session.user.email,
      successPath,
      failurePath: `/dashboard/${orgSlug}/billing`,
    });
  }

  if (!mpResult.ok) return { error: mpResult.error };

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: org.id },
      data: {
        plan: targetPlan,
        seats: org.kind === OrganizationKind.business ? seats : 1,
        billingCycle: quote.cycle,
        paymentMethod: PaymentMethod.card,
        billingStatus: BillingStatus.past_due,
        inTrial: false,
        currentPeriodEnd: periodEnd,
        mpSubscriptionId: mpResult.externalRef,
      },
    });
    await tx.billingInvoice.create({
      data: {
        organizationId: org.id,
        amountCents: quote.amountCents,
        currency: "ARS",
        paymentMethod: PaymentMethod.card,
        externalRef: mpResult.externalRef,
        periodStart: new Date(),
        periodEnd: periodEnd,
        notes: `${quote.description} — ${formatCents(quote.amountCents)}`,
      },
    });
  });

  revalidatePath(`/dashboard/${orgSlug}/billing`);
  revalidatePath(`/dashboard/${orgSlug}`);
  return { ok: true, checkoutUrl: mpResult.checkoutUrl };
}

export async function changePlanFormAction(
  orgSlug: string,
  _prev: ChangePlanState,
  formData: FormData,
): Promise<ChangePlanState> {
  const res = await changePlanAction(orgSlug, _prev, formData);
  if (res && "error" in res && res.error) return res;
  if (res && res.checkoutUrl) {
    redirect(res.checkoutUrl);
  }
  redirect(`/dashboard/${orgSlug}/billing`);
}
