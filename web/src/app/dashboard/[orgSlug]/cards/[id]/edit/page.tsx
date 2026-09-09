// app/dashboard/[orgSlug]/cards/[id]/edit/page.tsx — Server Component
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';
import CardEditor from './CardEditor';
import type { Layout, TypePair, PhotoShape, BgMode, LockKey } from './types';

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const { org, isAdmin, user } = await requireMembership(orgSlug);

  const card = await prisma.profile.findFirst({
    where: { id, organizationId: org.id },
    include: { links: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!card) notFound();

  // el empleado solo edita su propia tarjeta
  if (!isAdmin && card.ownerUserId !== user.id) notFound();

  const locks = (org.designLocks ?? {}) as Record<string, 'org' | 'member'>;

  return (
    <CardEditor
      orgSlug={orgSlug}
      isAdmin={isAdmin}
      plan={org.plan}
      brand={{
        name: org.name,
        initials: org.name.slice(0, 2).toUpperCase(),
        logoUrl: org.logoUrl,
        layout: (org.layout ?? 'retrato') as Layout,
        primary: org.primaryColor ?? '#13263F',
        secondary: org.secondaryColor ?? '#3C5A80',
        typePair: (org.typePair ?? 'clasico') as TypePair,
        photoShape: (org.photoShape ?? 'circulo') as PhotoShape,
        locks: {
          plantilla:   (locks.plantilla   ?? 'org')    as 'org' | 'member',
          colores:     (locks.colores     ?? 'org')    as 'org' | 'member',
          tipografia:  (locks.tipografia  ?? 'org')    as 'org' | 'member',
          foto:        (locks.foto        ?? 'member') as 'org' | 'member',
          fondo:       (locks.fondo       ?? 'member') as 'org' | 'member',
        },
      }}
      card={{
        id: card.id,
        slug: card.cardSlug,
        displayName: card.displayName,
        title: card.title ?? '',
        bio: card.bio ?? '',
        phone: card.phone ?? '',
        emailPublic: card.emailPublic ?? '',
        photoUrl: card.photoUrl,
        backgroundUrl: card.cardBackgroundUrl,
        // null = heredado de la marca
        layout: card.layout as Layout | null,
        primary: card.primaryColor,
        secondary: card.secondaryColor,
        typePair: card.typePair as TypePair | null,
        photoShape: card.photoShape as PhotoShape | null,
        bgMode: (card.bgMode ?? 'ninguno') as BgMode,
        links: card.links.map(l => ({
          id: l.id,
          kind: l.kind,
          title: l.title,
          url: l.url,
          enabled: l.enabled,
        })),
      }}
    />
  );
}
