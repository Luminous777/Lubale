// app/enviado/page.tsx — Server Component
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

type Query = {
  de?:      string; // handle del dueño
  name?:    string;
  email?:   string;
  company?: string;
};

export const metadata = { title: 'Datos enviados', robots: { index: false } };

export default async function SentPage({ searchParams }: { searchParams: Promise<Query> }) {
  const { de, name = '', email = '', company = '' } = await searchParams;

  const owner = de
    ? await prisma.profile.findFirst({
        where:  { cardSlug: de },
        select: { cardSlug: true, displayName: true },
      })
    : null;

  const ownerFirst = owner?.displayName.split(' ')[0] ?? 'Tu contacto';

  const initials =
    name
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase() || '·';

  const slugSuggestion = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const claimQuery = new URLSearchParams({
    name,
    email,
    company,
    slug:  slugSuggestion,
    trial: 'pro_30d',
  });

  return (
    <main className="flex min-h-dvh justify-center bg-bone px-4 py-11">
      <div className="flex h-fit w-full max-w-[560px] flex-col gap-[18px]">

        {/* Confirmación */}
        <section className="flex flex-col items-center gap-4 rounded-[22px] bg-white p-9">
          <span className="grid size-[60px] place-items-center rounded-full bg-navy text-[25px] text-white">
            ✓
          </span>
          <div className="flex flex-col gap-[9px] text-center">
            <h1 className="font-serif text-[32px] leading-[1.15]">Listo</h1>
            <p className="text-[14.5px] leading-[1.65] text-muted">
              {ownerFirst} ya tiene tus datos. Te va a escribir a
              <br />
              <span className="text-navy">{email}</span>
            </p>
          </div>
        </section>

        {/* Oferta viral */}
        <section className="flex items-center gap-7 rounded-[22px] bg-navy p-8 text-white">
          <div className="flex flex-1 flex-col gap-[15px]">
            <span className="self-start rounded-full bg-gold px-[13px] py-1.5 text-[10px] uppercase tracking-[0.16em]">
              1 mes Pro de regalo
            </span>
            <h2 className="font-serif text-[29px] leading-[1.18]">
              Tu propia tarjeta, con estos mismos datos
            </h2>
            <p className="text-[13.5px] leading-[1.65] text-white/65">
              Ya escribiste todo. Un clic y es tuya — sin contraseña.
            </p>
            <Link
              href={`/crear?${claimQuery}`}
              className="mt-0.5 self-start rounded-xl bg-white px-[26px] py-[15px] text-[14.5px] font-medium text-navy transition hover:bg-bone"
            >
              Crear mi tarjeta gratis
            </Link>
          </div>

          {/* Preview de la tarjeta del visitante */}
          <aside className="flex w-[190px] flex-none flex-col items-center gap-3 rounded-2xl bg-white/[0.08] p-5">
            <span className="grid size-14 place-items-center rounded-full border border-white/30 font-serif text-[19px] tracking-[0.06em]">
              {initials}
            </span>
            <div className="flex flex-col gap-1 text-center">
              <span className="text-sm">{name || 'Tu nombre'}</span>
              {company && <span className="text-[11.5px] text-white/55">{company}</span>}
            </div>
            <div className="h-px w-full bg-white/[0.14]" />
            <span className="text-[10.5px] uppercase tracking-[0.12em] text-white/45">
              lubela.app/{slugSuggestion || 'tu-nombre'}
            </span>
          </aside>
        </section>

        <Link
          href={owner ? `/${owner.cardSlug}` : '/'}
          className="text-center text-sm text-label transition hover:text-muted"
        >
          Ahora no
        </Link>

        <p className="text-center text-[12.5px] leading-[1.6] text-navy/30">
          Te mandamos la tarjeta de {ownerFirst} por email — desde ahí también podés crear la tuya.
        </p>

        <Link href="/" className="mt-2 flex flex-col items-center gap-1.5">
          <span className="font-serif text-[17px] tracking-[0.1em] text-navy/35">LUBELA</span>
        </Link>
      </div>
    </main>
  );
}
