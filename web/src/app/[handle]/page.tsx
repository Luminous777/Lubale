// app/[handle]/page.tsx — tarjeta pública (Server Component)
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RESERVED_HANDLES } from '@/lib/handles';
import CardQr from './CardQr';

const MARKS: Record<string, string> = {
  whatsapp: '◈',
  email:    '✉',
  phone:    '✆',
  web:      '⌘',
  social:   '◉',
  other:    '⌖',
};

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (RESERVED_HANDLES.has(handle)) return {};
  const profile = await prisma.profile.findFirst({
    where: { cardSlug: handle },
    include: { organization: true },
  });
  if (!profile) return {};
  return {
    title: `${profile.displayName} · ${profile.organization.name}`,
    description: profile.bio ?? undefined,
    openGraph: {
      title:       profile.displayName,
      description: profile.title ?? undefined,
      images:      profile.photoUrl ? [profile.photoUrl] : [],
    },
  };
}

export default async function PublicCardPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  if (RESERVED_HANDLES.has(handle)) notFound();

  const profile = await prisma.profile.findFirst({
    where: { cardSlug: handle },
    include: {
      organization: true,
      links: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!profile) notFound();

  const org = profile.organization;

  // Tarjeta desactivada → según la config de la org
  if (profile.status === 'disabled') {
    if (org.deactivatedBehavior === 'gone') notFound();
    return (
      <main className="grid min-h-dvh place-items-center bg-bone px-6 text-center">
        <p className="max-w-sm text-[15px] leading-[1.7] text-muted">
          Esta persona ya no forma parte de {org.name}.
        </p>
      </main>
    );
  }

  // Registra la visita después de servir la respuesta (no bloquea el render)
  after(async () => {
    await prisma.cardView.create({ data: { profileId: profile.id } });
  });

  // Regla de plan: Esencial muestra solo el link de WhatsApp
  const visibleLinks =
    org.plan === 'free'
      ? profile.links.filter(l => l.kind === 'whatsapp').slice(0, 1)
      : profile.links;

  const initials = profile.displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const primary   = org.primaryColor   ?? '#13263F';
  const secondary = org.secondaryColor ?? '#3C5A80';
  const bg        = profile.cardBackgroundUrl ?? org.cardBackgroundUrl;
  const cardUrl   = `https://lubela.app/${profile.cardSlug}`;

  return (
    <main className="flex min-h-dvh flex-col items-center bg-bone px-4 py-9">
      <article className="w-full max-w-[520px] overflow-hidden rounded-3xl bg-white shadow-[0_30px_70px_-34px_rgba(19,38,63,0.4)]">

        {/* Franja de marca */}
        <div
          className="h-[9px]"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
        />

        {/* Hero */}
        <header
          className="relative flex flex-col items-center gap-4 px-9 pb-[34px] pt-[26px]"
          style={
            bg
              ? { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { backgroundColor: primary }
          }
        >
          {bg && <div className="absolute inset-0 bg-navy/70 backdrop-blur-[2px]" />}

          {/* Logo / nombre de empresa */}
          {org.logoUrl ? (
            <Image
              src={org.logoUrl}
              alt={org.name}
              width={28}
              height={28}
              className="absolute left-[26px] top-[22px] z-10 size-7 rounded-[7px] object-cover"
            />
          ) : (
            <div className="absolute left-[26px] top-[22px] z-10 flex items-center gap-[9px]">
              <span className="grid size-7 place-items-center rounded-[7px] border border-white/20 bg-white/[0.14] font-serif text-xs text-white">
                {org.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-white/55">{org.name}</span>
            </div>
          )}

          {/* Foto o iniciales */}
          {profile.photoUrl ? (
            <Image
              src={profile.photoUrl}
              alt={profile.displayName}
              width={112}
              height={112}
              className="relative z-10 mt-3.5 size-28 rounded-full border border-white/30 object-cover"
            />
          ) : (
            <span className="relative z-10 mt-3.5 grid size-28 place-items-center rounded-full border border-white/[0.32] pl-[0.1em] font-serif text-[38px] tracking-[0.1em] text-white">
              {initials}
            </span>
          )}

          <div className="relative z-10 flex flex-col gap-[7px] text-center">
            <h1 className="font-serif text-[34px] leading-[1.1] text-white">{profile.displayName}</h1>
            {profile.title && (
              <p className="text-[11.5px] uppercase tracking-[0.2em] text-white/60">{profile.title}</p>
            )}
          </div>
        </header>

        <div className="flex flex-col gap-[22px] px-9 pb-[30px] pt-[26px]">
          {profile.bio && (
            <p className="text-center text-[15px] leading-[1.75] text-navy/70 text-pretty">{profile.bio}</p>
          )}

          {/* Acciones rápidas */}
          {visibleLinks.length > 0 && (
            <nav className="flex flex-wrap justify-center gap-3">
              {visibleLinks.map(l => (
                <a
                  key={l.id}
                  href={`/api/t/${l.id}`}
                  rel="noopener"
                  className="flex flex-col items-center gap-2"
                >
                  <span className="grid size-[52px] place-items-center rounded-full border border-navy/[0.14] font-serif text-lg text-navy transition hover:bg-bone">
                    {MARKS[l.kind] ?? '⌖'}
                  </span>
                  <span className="text-[10.5px] uppercase tracking-[0.1em] text-label">{l.title}</span>
                </a>
              ))}
            </nav>
          )}

          {/* Datos */}
          <dl className="flex flex-col">
            {profile.phone       && <Row label="Teléfono" value={profile.phone} />}
            {profile.emailPublic && <Row label="Email"    value={profile.emailPublic} />}
            {visibleLinks
              .filter(l => l.kind === 'web')
              .map(l => (
                <Row key={l.id} label="Web" value={l.url.replace(/^https?:\/\//, '')} />
              ))}
          </dl>

          {/* QR + vCard */}
          <CardQr
            url={cardUrl}
            slug={profile.cardSlug}
            vcardHref={`/api/vcard/${org.slug}/${profile.cardSlug}`}
            color={primary}
          />

          <Link
            href={`/${profile.cardSlug}/contacto`}
            className="grid h-[54px] place-items-center rounded-[13px] bg-navy text-[15.5px] font-medium text-white transition hover:bg-navy-deep"
          >
            Dejar mis datos
          </Link>
        </div>
      </article>

      {/* Footer mínimo */}
      <Link href="/" className="mt-6 flex flex-col items-center gap-1.5 text-center">
        <span className="font-serif text-[17px] tracking-[0.1em] text-navy/40">LUBELA</span>
        <span className="text-[12.5px] text-label">Crear tarjetas para tu empresa →</span>
      </Link>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-[18px] border-b border-navy/[0.08] py-3.5">
      <dt className="flex-none text-[10.5px] uppercase tracking-[0.16em] text-label">{label}</dt>
      <dd className="text-right text-sm">{value}</dd>
    </div>
  );
}
