// app/api/webhooks/mercadopago/route.ts
import { BillingPlan, BillingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  verifyMpSignature,
  fetchMpSubscription,
  fetchMpPayment,
} from '@/lib/billing';

export async function POST(req: Request) {
  const raw = await req.text();

  if (!verifyMpSignature(req)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const body = JSON.parse(raw) as {
    type?:   string;
    action?: string;
    data?:   { id?: string };
  };
  const id = body.data?.id;
  if (!id) return Response.json({ ok: true });

  // Idempotencia: MP reintenta el mismo evento si no respondemos 200 rápido.
  const eventKey = `${body.type ?? body.action}:${id}`;
  const seen     = await prisma.webhookEvent.findUnique({ where: { key: eventKey } });
  if (seen) return Response.json({ ok: true, duplicate: true });
  await prisma.webhookEvent.create({ data: { key: eventKey, payload: raw.slice(0, 4000) } });

  // ── Suscripción (preapproval) ──────────────────────────────────────────────
  if (body.type === 'subscription_preapproval') {
    const sub = await fetchMpSubscription(id);
    const org = await prisma.organization.findFirst({
      where: { OR: [{ mpSubscriptionId: id }, { id: sub.externalReference }] },
    });
    if (!org) return Response.json({ ok: true });

    const statusMap: Record<string, BillingStatus> = {
      authorized: BillingStatus.active,
      paused:     BillingStatus.past_due,
      cancelled:  BillingStatus.canceled,
      pending:    BillingStatus.none,
    };

    await prisma.organization.update({
      where: { id: org.id },
      data:  {
        mpSubscriptionId: id,
        billingStatus:    statusMap[sub.status] ?? BillingStatus.none,
        // El plan no cambia por el estado de la suscripción, salvo cancelación.
        plan:             sub.status === 'cancelled' ? BillingPlan.free : org.plan,
        inTrial:          sub.status === 'authorized' ? false : org.inTrial,
        currentPeriodEnd: sub.nextPaymentDate ? new Date(sub.nextPaymentDate) : org.currentPeriodEnd,
      },
    });
  }

  // ── Pago individual ────────────────────────────────────────────────────────
  if (body.type === 'payment') {
    const pay = await fetchMpPayment(id);

    const orConds: { mpSubscriptionId?: string; id?: string }[] = [];
    if (pay.subscriptionId) orConds.push({ mpSubscriptionId: pay.subscriptionId });
    if (pay.externalReference) orConds.push({ id: pay.externalReference });
    if (orConds.length === 0) return Response.json({ ok: true });

    const org = await prisma.organization.findFirst({ where: { OR: orConds } });
    if (!org) return Response.json({ ok: true });

    if (pay.status === 'approved') {
      const when = pay.dateApproved ? new Date(pay.dateApproved) : new Date();
      await prisma.$transaction([
        prisma.billingInvoice.upsert({
          where:  { externalRef: pay.id },
          create: {
            organizationId: org.id,
            amountCents:    Math.round(pay.amount * 100),
            currency:       pay.currency ?? 'ARS',
            externalRef:    pay.id,
            paidAt:         when,
            periodStart:    when,
            periodEnd:      org.currentPeriodEnd ?? when,
          },
          update: { paidAt: when },
        }),
        prisma.organization.update({
          where: { id: org.id },
          data:  { billingStatus: BillingStatus.active },
        }),
      ]);
    }

    if (pay.status === 'rejected') {
      await prisma.organization.update({
        where: { id: org.id },
        data:  { billingStatus: BillingStatus.past_due },
      });
    }
  }

  return Response.json({ ok: true });
}
