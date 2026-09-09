// app/dashboard/[orgSlug]/cards/page.tsx
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';
import { toggleCardStatus } from './actions';

type Filter = 'todas' | 'activas' | 'pausadas';

const LAYOUT_NAMES: Record<string, string> = {
  retrato: 'Retrato',
  franja: 'Franja',
  editorial: 'Editorial',
  panoramica: 'Panorámica',
  monograma: 'Monograma',
  minimal: 'Mínima',
};

export default async function CardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ estado?: Filter; q?: string }>;
}) {
  const { orgSlug } = await params;
  const { estado = 'todas', q = '' } = await searchParams;
  const { org, isAdmin } = await requireMembership(orgSlug);

  const cards = await prisma.profile.findMany({
    where: {
      organizationId: org.id,
      ...(estado === 'activas' ? { status: 'active' } : {}),
      ...(estado === 'pausadas' ? { status: 'disabled' } : {}),
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: 'insensitive' } },
              { cardSlug: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: 'asc' }, { displayName: 'asc' }],
    include: {
      owner: { select: { name: true } },
      _count: { select: { views: true, leads: true } },
      links: { select: { _count: { select: { clicks: true } } } },
    },
  });

  const active = cards.filter(c => c.status === 'active').length;
  const filters: Filter[] = ['todas', 'activas', 'pausadas'];

  const primary = org.primaryColor ?? '#13263F';
  const secondary = org.secondaryColor ?? '#3C5A80';

  return (
    <div className="flex flex-col gap-5 px-9 pb-11 pt-8">
      <header className="flex items-end justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] leading-[1.1]">Tarjetas</h1>
          <p className="text-[13.5px] text-muted">
            {cards.length} {cards.length === 1 ? 'tarjeta' : 'tarjetas'} · {active} activas
          </p>
        </div>
        {isAdmin && (
          <Link
            href={`/dashboard/${orgSlug}/cards/new`}
            className="rounded-[11px] bg-navy px-[18px] py-3 text-[13.5px] text-white"
          >
            Nueva tarjeta
          </Link>
        )}
      </header>

      <form className="flex items-center gap-2.5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o link"
          className="h-[42px] flex-1 rounded-[11px] bg-bone px-[15px] text-[13.5px] text-navy outline-none placeholder:text-label"
        />
        <input type="hidden" name="estado" value={estado} />
        {filters.map(f => (
          <Link
            key={f}
            href={`/dashboard/${orgSlug}/cards?estado=${f}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`rounded-full border px-4 py-[11px] text-[12.5px] capitalize ${
              estado === f
                ? 'border-navy bg-navy text-white'
                : 'border-navy/[0.18] bg-white text-muted'
            }`}
          >
            {f}
          </Link>
        ))}
      </form>

      {cards.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-navy/20 py-16 text-center">
          <p className="max-w-xs text-[13.5px] leading-[1.7] text-muted">
            {q ? `Sin resultados para "${q}".` : 'Todavía no hay tarjetas en esta organización.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3.5">
          {cards.map(c => {
            const clicks = c.links.reduce((sum, l) => sum + l._count.clicks, 0);
            const isActive = c.status === 'active';
            const layout = c.layout ?? org.layout ?? 'retrato';
            const inherited = !c.layout;

            return (
              <article
                key={c.id}
                className="overflow-hidden rounded-2xl border border-navy/10 bg-white transition hover:border-navy"
              >
                <div
                  className="h-1.5"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${c.primaryColor ?? primary}, ${
                          c.secondaryColor ?? secondary
                        })`
                      : 'rgba(19,38,63,0.14)',
                  }}
                />
                <div className="flex flex-col gap-3.5 p-[18px]">
                  <div className="flex items-start gap-3">
                    <span
                      className="grid size-11 flex-none place-items-center rounded-[11px] font-serif text-base text-white"
                      style={{ backgroundColor: c.primaryColor ?? primary }}
                    >
                      {initials(c.displayName)}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <h2 className="truncate text-[14.5px] font-medium">{c.displayName}</h2>
                      <p className="truncate text-[11.5px] text-label">lubela.app/{c.cardSlug}</p>
                    </div>
                    <span
                      className={`flex-none rounded-full px-2.5 py-1 text-[9.5px] uppercase tracking-[0.1em] ${
                        isActive ? 'bg-green/10 text-green' : 'bg-gold/[0.14] text-gold'
                      }`}
                    >
                      {isActive ? 'Activa' : 'Pausada'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{c.owner?.name ?? 'Sin asignar'}</span>
                    <span className="text-navy/20">·</span>
                    <span>{LAYOUT_NAMES[layout] ?? layout}</span>
                    {inherited ? (
                      <span className="rounded-full bg-navy/[0.06] px-2 py-0.5 text-[9.5px] uppercase tracking-[0.1em] text-navy/45">
                        Marca
                      </span>
                    ) : (
                      <span className="rounded-full bg-gold/[0.14] px-2 py-0.5 text-[9.5px] uppercase tracking-[0.1em] text-gold">
                        Propio
                      </span>
                    )}
                  </div>

                  <dl className="flex gap-5 border-t border-navy/[0.07] pt-3">
                    <Metric value={c._count.views} label="vistas" />
                    <Metric value={clicks} label="clicks" />
                    <Metric value={c._count.leads} label="contactos" />
                  </dl>

                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/${orgSlug}/cards/${c.id}/edit`}
                      className="flex-1 rounded-[9px] border border-navy/[0.14] py-2.5 text-center text-[12.5px]"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/${c.cardSlug}`}
                      target="_blank"
                      className="flex-1 rounded-[9px] border border-navy/[0.14] py-2.5 text-center text-[12.5px]"
                    >
                      Ver
                    </Link>
                    {isAdmin && (
                      <form action={toggleCardStatus}>
                        <input type="hidden" name="profileId" value={c.id} />
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <button className="rounded-[9px] border border-navy/[0.14] px-[13px] py-2.5 text-[12.5px] text-muted">
                          {isActive ? 'Pausar' : 'Activar'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-serif text-[19px] leading-none">{value.toLocaleString('es-AR')}</dt>
      <dd className="text-[9.5px] uppercase tracking-[0.12em] text-navy/30">{label}</dd>
    </div>
  );
}

const initials = (n: string) => n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
