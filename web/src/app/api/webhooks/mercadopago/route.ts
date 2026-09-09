// app/api/webhooks/mercadopago/route.ts
import { prisma } from '@/lib/prisma';
import {
  verifyMpSignature,
  fetchMpSubscription,
  fetchMpPayment,
} from '@/lib/mercadopago';

export async function POST(req: Request) {
  const raw = await req.text();

  if (!verifyMpSignature(req.headers, raw)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const body = JSON.parse(raw) as {
    type?:   string;
    action?: string;
    data?:   { id?: string };
  };
  const id = body.data?.id;
  if (!id) return Response.json({ ok: true });

  // Idempotencia: MP reintenta el mismo evento si no respondemos 200 rápido
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

    const statusMap: Record<string, string> = {
      authorized: 'active',
      paused:     'past_due',
      cancelled:  'canceled',
      pending:    'none',
    };

    await prisma.organization.update({
      where: { id: org.id },
      data:  {
        mpSubscriptionId: id,
        billingStatus:    (statusMap[sub.status] ?? 'none') as 'active' | 'past_due' | 'canceled' | 'none',
        plan:             sub.status === 'cancelled' ? 'free' : (sub.plan ?? org.plan) as 'free' | 'pro' | 'business',
        trialEndsAt:      sub.status === 'authorized' ? null : org.trialEndsAt,
        currentPeriodEnd: sub.nextPaymentDate ? new Date(sub.nextPaymentDate) : null,
      },
    });
  }

  // ── Pago individual ────────────────────────────────────────────────────────
  if (body.type === 'payment') {
    const pay = await fetchMpPayment(id);
    const org = await prisma.organization.findFirst({
      where: { mpSubscriptionId: pay.subscriptionId },
    });
    if (!org) return Response.json({ ok: true });

    if (pay.status === 'approved') {
      await prisma.$transaction([
        prisma.billingInvoice.upsert({
          where:  { externalRef: pay.id },
          create: {
            organizationId: org.id,
            amountCents:    Math.round(pay.amount * 100),
            currency:       pay.currency ?? 'ARS',
            externalRef:    pay.id,
            paidAt:         new Date(pay.dateApproved!),
            periodStart:    new Date(pay.periodStart  ?? pay.dateApproved!),
            periodEnd:      new Date(pay.periodEnd    ?? pay.dateApproved!),
          },
          update: { paidAt: new Date(pay.dateApproved!) },
        }),
        prisma.organization.update({
          where: { id: org.id },
          data:  { billingStatus: 'active' },
        }),
      ]);
    }

    if (pay.status === 'rejected') {
      await prisma.organization.update({
        where: { id: org.id },
        data:  { billingStatus: 'past_due' },
      });
    }
  }

  return Response.json({ ok: true });
}
