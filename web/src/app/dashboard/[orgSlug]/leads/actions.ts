'use server';

import { revalidatePath } from 'next/cache';
import { LeadStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';

export async function setLeadStatus({
  orgSlug,
  leadId,
  status,
}: {
  orgSlug: string;
  leadId: string;
  status: string;
}) {
  if (!(status in LeadStatus)) throw new Error('Estado inválido.');
  const nextStatus = status as LeadStatus;

  const { org, isAdmin, user } = await requireMembership(orgSlug);

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      profile: { organizationId: org.id, ...(isAdmin ? {} : { ownerUserId: user.id }) },
    },
    select: { id: true },
  });
  if (!lead) throw new Error('Contacto no encontrado.');

  await prisma.lead.update({ where: { id: leadId }, data: { status: nextStatus } });
  revalidatePath(`/dashboard/${orgSlug}/leads`);
}
