// app/[handle]/contacto/page.tsx — Server Component
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { RESERVED_HANDLES } from '@/lib/handles';
import LeadForm from './LeadForm';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (RESERVED_HANDLES.has(handle)) return {};
  const p = await prisma.profile.findFirst({ where: { cardSlug: handle } });
  return p ? { title: `Dejale tus datos a ${p.displayName}`, robots: { index: false } } : {};
}

export default async function ContactPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  if (RESERVED_HANDLES.has(handle)) notFound();

  const profile = await prisma.profile.findFirst({
    where: { cardSlug: handle, status: 'active' },
    include: { organization: true },
  });
  if (!profile) notFound();

  const org = profile.organization;
  const initials = profile.displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <main className="flex min-h-dvh justify-center bg-bone px-4 py-9">
      <article className="h-fit w-full max-w-[520px] overflow-hidden rounded-3xl bg-white shadow-[0_30px_70px_-34px_rgba(19,38,63,0.4)]">
        <header
          className="flex flex-col gap-[15px] px-9 py-[26px]"
          style={{ backgroundColor: org.primaryColor ?? '#13263F' }}
        >
          <div className="flex items-center gap-3.5">
            {profile.photoUrl ? (
              <Image
                src={profile.photoUrl}
                alt={profile.displayName}
                width={52}
                height={52}
                className="size-13 flex-none rounded-full border border-white/30 object-cover"
              />
            ) : (
              <span className="grid size-13 flex-none place-items-center rounded-full border border-white/30 font-serif text-lg tracking-[0.06em] text-white">
                {initials}
              </span>
            )}
            <div className="flex flex-col gap-[3px]">
              <h1 className="font-serif text-[23px] text-white">{profile.displayName}</h1>
              {profile.title && (
                <p className="text-[10.5px] uppercase tracking-[0.16em] text-white/55">
                  {profile.title} · {org.name}
                </p>
              )}
            </div>
          </div>
          <p className="text-[14.5px] leading-[1.6] text-white/70 text-pretty">
            Dejame tus datos y te escribo. No se comparten con nadie más.
          </p>
        </header>

        <LeadForm
          profileId={profile.id}
          handle={profile.cardSlug}
          ownerFirstName={profile.displayName.split(' ')[0]}
        />
      </article>
    </main>
  );
}
