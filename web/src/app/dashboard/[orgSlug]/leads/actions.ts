'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';

const VALID = ['nuevo', 'evento', 'contactado'];

export async function setLeadStatus({
  orgSlug,
  leadId,
  status,
}: {
  orgSlug: string;
  leadId: string;
  status: string;
}) {
  if (!VALID.includes(status)) throw new Error('Estado inválido.');

  const { org, isAdmin, user } = await requireMembership(orgSlug);

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      profile: { organizationId: org.id, ...(isAdmin ? {} : { ownerUserId: user.id }) },
    },
    select: { id: true },
  });
  if (!lead) throw new Error('Contacto no encontrado.');

  await prisma.lead.update({ where: { id: leadId }, data: { status } });
  revalidatePath(`/dashboard/${orgSlug}/leads`);
}
