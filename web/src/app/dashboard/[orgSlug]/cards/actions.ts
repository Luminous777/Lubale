'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';

export async function toggleCardStatus(formData: FormData) {
  const profileId = String(formData.get('profileId'));
  const orgSlug = String(formData.get('orgSlug'));

  const { org, isAdmin } = await requireMembership(orgSlug);
  if (!isAdmin) throw new Error('Solo los admins pueden pausar tarjetas.');

  const card = await prisma.profile.findFirst({
    where: { id: profileId, organizationId: org.id },
    select: { status: true },
  });
  if (!card) throw new Error('Tarjeta no encontrada.');

  await prisma.profile.update({
    where: { id: profileId },
    data: { status: card.status === 'active' ? 'disabled' : 'active' },
  });

  revalidatePath(`/dashboard/${orgSlug}/cards`);
}
