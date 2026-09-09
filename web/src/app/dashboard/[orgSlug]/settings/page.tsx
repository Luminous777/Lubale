// app/dashboard/[orgSlug]/settings/page.tsx — Server Component
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';
import BrandSettings from './BrandSettings';
import type { Layout, TypePair, PhotoShape, LockKey } from '../cards/[id]/edit/types';

export default async function SettingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, isAdmin } = await requireMembership(orgSlug);
  if (!isAdmin) notFound();

  const cardCount = await prisma.profile.count({ where: { organizationId: org.id } });
  const locks = (org.designLocks ?? {}) as Record<string, 'org' | 'member'>;

  return (
    <BrandSettings
      orgSlug={orgSlug}
      plan={org.plan}
      cardCount={cardCount}
      brand={{
        name:             org.name,
        slug:             org.slug,
        logoUrl:          org.logoUrl,
        backgroundUrl:    org.cardBackgroundUrl,
        primary:          org.primaryColor ?? '#13263F',
        secondary:        org.secondaryColor ?? '#3C5A80',
        layout:           (org.layout ?? 'retrato') as Layout,
        typePair:         (org.typePair ?? 'clasico') as TypePair,
        photoShape:       (org.photoShape ?? 'circulo') as PhotoShape,
        disabledBehavior: org.disabledCardBehavior ?? '404',
        disabledMessage:  org.disabledCardMessage ?? '',
        locks: {
          plantilla:  (locks.plantilla  ?? 'org')    as 'org' | 'member',
          colores:    (locks.colores    ?? 'org')    as 'org' | 'member',
          tipografia: (locks.tipografia ?? 'org')    as 'org' | 'member',
          foto:       (locks.foto       ?? 'member') as 'org' | 'member',
          fondo:      (locks.fondo      ?? 'member') as 'org' | 'member',
        },
      }}
    />
  );
}
