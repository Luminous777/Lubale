'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';
import { suggestBranding } from '@/lib/ai';
import { RESERVED_HANDLES } from '@/lib/handles';

const HEX = /^#[0-9a-f]{6}$/i;

async function admin(orgSlug: string) {
  const ctx = await requireMembership(orgSlug);
  if (!ctx.isAdmin) throw new Error('Solo los admins pueden editar la marca.');
  return ctx;
}

export async function saveBrand({ orgSlug, brand }: { orgSlug: string; brand: any }) {
  const { org } = await admin(orgSlug);

  const slug = String(brand.slug).trim();
  if (slug.length < 3 || RESERVED_HANDLES.has(slug))
    throw new Error('Ese link no está disponible.');

  if (slug !== org.slug) {
    const taken        = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    const takenByCard  = await prisma.profile.findFirst({ where: { cardSlug: slug }, select: { id: true } });
    if (taken || takenByCard) throw new Error('Ese link ya está en uso.');
  }

  if (!HEX.test(brand.primary) || !HEX.test(brand.secondary))
    throw new Error('Color inválido.');

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      name:                String(brand.name).trim().slice(0, 80),
      slug,
      primaryColor:        brand.primary,
      secondaryColor:      brand.secondary,
      layout:              brand.layout,
      typePair:            brand.typePair,
      photoShape:          brand.photoShape,
      designLocks:         brand.locks,
      disabledCardBehavior: brand.disabledBehavior,
      disabledCardMessage:  brand.disabledBehavior === 'msg'
        ? String(brand.disabledMessage).slice(0, 140)
        : null,
    },
  });

  revalidatePath(`/dashboard/${orgSlug}/settings`);
  revalidatePath(`/dashboard/${orgSlug}/cards`);
  return { ok: true };
}

export async function generateBranding({
  orgSlug,
  prompt,
}: {
  orgSlug: string;
  prompt: string;
}): Promise<{
  ok: boolean;
  primary?: string;
  secondary?: string;
  quota?: { used: number; total: number };
  error?: string;
}> {
  const { org } = await admin(orgSlug);
  if (org.plan !== 'business')
    return { ok: false, error: 'La IA de branding está en el plan Empresa.' };

  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const TOTAL = 4;

  // findFirst + create pattern (evita problema de upsert con userId nullable en unique)
  let usage = await prisma.aiQuotaUsage.findFirst({
    where: { organizationId: org.id, userId: null, scope: 'org_branding', periodStart },
  });
  if (!usage) {
    usage = await prisma.aiQuotaUsage.create({
      data: { organizationId: org.id, userId: null, scope: 'org_branding', periodStart, textsUsed: 0, imagesUsed: 0 },
    });
  }

  if (usage.textsUsed >= TOTAL)
    return { ok: false, error: 'Se agotó el cupo de branding de este mes.' };

  const result = await suggestBranding({ prompt, orgName: org.name });
  if (!HEX.test(result.primary) || !HEX.test(result.secondary))
    return { ok: false, error: 'La propuesta vino incompleta. Probá de nuevo.' };

  const next = await prisma.aiQuotaUsage.update({
    where:  { id: usage.id },
    data:   { textsUsed: { increment: 1 } },
  });

  return {
    ok:       true,
    primary:  result.primary,
    secondary: result.secondary,
    quota:    { used: next.textsUsed, total: TOTAL },
  };
}
