'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';
import {
  createSubscriptionPreference,
  updateSubscriptionSeats,
  cancelMpSubscription,
} from '@/lib/mercadopago';

const PRICES: Record<string, number> = { pro: 1599, business: 3999 };

async function admin(orgSlug: string) {
  const ctx = await requireMembership(orgSlug);
  if (!ctx.isAdmin) throw new Error('Solo los admins gestionan el plan.');
  return ctx;
}

export async function startCheckout({
  orgSlug,
  targetPlan,
}: {
  orgSlug: string;
  targetPlan: string;
}): Promise<{ url?: string; error?: string }> {
  const { org, user } = await admin(orgSlug);
  if (!PRICES[targetPlan]) return { error: 'Plan inválido.' };

  const seats = targetPlan === 'business' ? Math.max(org.seats ?? 1, 1) : 1;

  const pref = await createSubscriptionPreference({
    orgId:      org.id,
    plan:       targetPlan,
    seats,
    amount:     PRICES[targetPlan] * seats,
    payerEmail: user.email,
    backUrl:    `https://lubela.app/dashboard/${orgSlug}/billing?checkout=ok`,
  });

  return { url: pref.initPoint };
}

export async function changeSeats({ orgSlug, seats }: { orgSlug: string; seats: number }) {
  const { org } = await admin(orgSlug);
  if (org.plan !== 'business') throw new Error('Los asientos son del plan Empresa.');

  const used = await prisma.membership.count({
    where: { organizationId: org.id, status: { not: 'disabled' } },
  });
  if (seats < Math.max(1, used)) throw new Error('No podés bajar de los asientos en uso.');
  if (seats > 200) throw new Error('Para más de 200 asientos, hablemos.');

  if (org.mpSubscriptionId) {
    await updateSubscriptionSeats({
      subscriptionId: org.mpSubscriptionId,
      amount: PRICES.business * seats,
    });
  }

  await prisma.organization.update({ where: { id: org.id }, data: { seats } });
  revalidatePath(`/dashboard/${orgSlug}/billing`);
  revalidatePath(`/dashboard/${orgSlug}/team`);
}

export async function cancelSubscription({ orgSlug }: { orgSlug: string }) {
  const { org } = await admin(orgSlug);
  if (!org.mpSubscriptionId) throw new Error('No hay suscripción activa.');

  await cancelMpSubscription(org.mpSubscriptionId);

  // No bajamos el plan acá: sigue hasta fin de período; el webhook lo cierra
  await prisma.organization.update({
    where: { id: org.id },
    data:  { billingStatus: 'canceled' },
  });
  revalidatePath(`/dashboard/${orgSlug}/billing`);
}
