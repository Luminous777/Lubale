import { NextResponse } from "next/server";
import { BillingStatus, BillingPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// MercadoPago envía notificaciones IPN y webhooks a esta URL.
// Configurar en el panel de MP: https://www.mercadopago.com.ar/developers/panel/webhooks
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: true });

    const topic = body.topic ?? body.type;
    const resourceId = body.id ?? body.data?.id;

    if (!resourceId) return NextResponse.json({ ok: true });

    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ ok: true });

    const { MercadoPagoConfig, PreApproval, Payment } = await import("mercadopago");
    const client = new MercadoPagoConfig({ accessToken: token });

    if (topic === "preapproval" || topic === "subscription_preapproval") {
      const preApproval = new PreApproval(client);
      const data = await preApproval.get({ id: String(resourceId) });

      const externalRef = data.external_reference;
      if (!externalRef) return NextResponse.json({ ok: true });

      const orgId = extractOrgId(externalRef);
      if (!orgId) return NextResponse.json({ ok: true });

      const status = data.status;
      if (status === "authorized") {
        await activateOrg(orgId, externalRef);
      } else if (status === "cancelled" || status === "paused") {
        await deactivateOrg(orgId);
      }
    }

    if (topic === "payment" || topic === "payment.created" || topic === "payment.updated") {
      const payment = new Payment(client);
      const data = await payment.get({ id: String(resourceId) });

      const externalRef = data.external_reference;
      if (!externalRef) return NextResponse.json({ ok: true });

      const orgId = extractOrgId(externalRef);
      if (!orgId) return NextResponse.json({ ok: true });

      if (data.status === "approved") {
        await activateOrg(orgId, externalRef);
        await prisma.billingInvoice.create({
          data: {
            organizationId: orgId,
            amountCents: Math.round((data.transaction_amount ?? 0) * 100),
            currency: "ARS",
            paymentMethod: "card",
            paidAt: new Date(),
            notes: `Pago MP #${resourceId}`,
            externalRef: String(resourceId),
            periodStart: new Date(),
            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[MP webhook]", e);
    return NextResponse.json({ ok: true }); // Siempre 200 para que MP no reintente
  }
}

function extractOrgId(externalRef: string): string | null {
  const match = externalRef.match(/^mp_(?:once_)?([^_]+)_/);
  return match?.[1] ?? null;
}

async function activateOrg(orgId: string, externalRef: string) {
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      plan: BillingPlan.pro,
      billingStatus: BillingStatus.active,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      inTrial: false,
      mpSubscriptionId: externalRef,
    },
  });
}

async function deactivateOrg(orgId: string) {
  await prisma.organization.update({
    where: { id: orgId },
    data: { billingStatus: BillingStatus.past_due },
  });
}
