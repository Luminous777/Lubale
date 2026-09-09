'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';
import type { Card } from './types';

export async function saveCard({ orgSlug, card }: { orgSlug: string; card: Card }) {
  const { org, isAdmin, user } = await requireMembership(orgSlug);

  const existing = await prisma.profile.findFirst({
    where: { id: card.id, organizationId: org.id },
    select: { ownerUserId: true },
  });
  if (!existing) throw new Error('Tarjeta no encontrada.');
  if (!isAdmin && existing.ownerUserId !== user.id) throw new Error('Sin permiso.');

  const locks = (org.designLocks ?? {}) as Record<string, 'org' | 'member'>;
  const locked = (k: string) =>
    (locks[k] ?? (k === 'foto' || k === 'fondo' ? 'member' : 'org')) === 'org';

  // los campos bloqueados por la marca vuelven a null → heredan
  const design = {
    layout:       locked('plantilla')  ? null        : card.layout,
    primaryColor: locked('colores')    ? null        : card.primary,
    secondaryColor: locked('colores')  ? null        : card.secondary,
    typePair:     locked('tipografia') ? null        : card.typePair,
    photoShape:   locked('foto')       ? null        : card.photoShape,
    bgMode:       locked('fondo')      ? 'ninguno'   : card.bgMode,
  };

  await prisma.$transaction([
    prisma.profile.update({
      where: { id: card.id },
      data: {
        displayName: card.displayName.trim(),
        title:       card.title.trim()      || null,
        bio:         card.bio.trim().slice(0, 200) || null,
        phone:       card.phone.trim()      || null,
        emailPublic: card.emailPublic.trim() || null,
        ...design,
      },
    }),
    ...card.links.map((l, i) =>
      prisma.profileLink.update({
        where: { id: l.id },
        data: { url: l.url.trim(), enabled: l.enabled, sortOrder: i },
      })
    ),
  ]);

  revalidatePath(`/dashboard/${orgSlug}/cards`);
  revalidatePath(`/${card.slug}`);
}
