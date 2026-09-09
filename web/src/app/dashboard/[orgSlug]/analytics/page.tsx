// app/dashboard/[orgSlug]/analytics/page.tsx — Server Component
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';

type Range = '7' | '30' | '90';

const KIND_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', email: 'Email', phone: 'Teléfono',
  web: 'Web', social: 'Redes', other: 'Otros',
};

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ dias?: Range }>;
}) {
  const { orgSlug } = await params;
  const { dias = '30' } = await searchParams;
  const { org } = await requireMembership(orgSlug);

  const days = Number(dias);
  const since = new Date(Date.now() - days * 864e5);
  const prevSince = new Date(Date.now() - days * 2 * 864e5);

  const scope = { profile: { organizationId: org.id } };
  const linkScope = { link: { profile: { organizationId: org.id } } };

  const [views, prevViews, clicks, activeCards, leads, weeks, ranking, byKind] = await Promise.all([
    prisma.cardView.count({ where: { ...scope, viewedAt: { gt: since } } }),
    prisma.cardView.count({ where: { ...scope, viewedAt: { gt: prevSince, lte: since } } }),
    prisma.linkClick.count({ where: { ...linkScope, clickedAt: { gt: since } } }),
    prisma.profile.count({ where: { organizationId: org.id, status: 'active' } }),
    prisma.lead.count({ where: { ...scope, createdAt: { gt: since } } }),
    viewsByWeek(org.id),
    cardRanking(org.id, since),
    clicksByKind(org.id, since),
  ]);

  const totalCards = await prisma.profile.count({ where: { organizationId: org.id } });
  const max = Math.max(...weeks.map(w => w.count), 1);
  const topViews = Math.max(...ranking.map(r => r.views), 1);
  const topClicks = Math.max(...byKind.map(k => k.clicks), 1);
  const growth = prevViews === 0 ? null : Math.round(((views - prevViews) / prevViews) * 100);

  const stats = [
    {
      value: fmt(views),
      label: 'Vistas totales',
      delta: growth === null ? 'primer período' : `${growth > 0 ? '+' : ''}${growth}% vs. anterior`,
      deltaTone: growth !== null && growth > 0 ? 'green' : 'muted',
      featured: true,
    },
    { value: fmt(clicks),      label: 'Clicks en links',  delta: `${pct(clicks, views)} de conversión`,  deltaTone: 'muted'  },
    { value: fmt(activeCards), label: 'Tarjetas activas', delta: `de ${totalCards} totales`,              deltaTone: 'muted'  },
    { value: fmt(leads),       label: 'Contactos',        delta: `${pct(leads, views)} de las vistas`,   deltaTone: 'green'  },
  ];

  return (
    <div className="flex flex-col gap-5 px-9 pb-11 pt-8">
      <header className="flex items-end justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] leading-[1.1]">Analítica</h1>
          <p className="text-[13.5px] text-muted">
            {org.name} · últimos {days} días
          </p>
        </div>
        <nav className="flex gap-2">
          {(['7', '30', '90'] as Range[]).map(r => (
            <Link
              key={r}
              href={`/dashboard/${orgSlug}/analytics?dias=${r}`}
              className={`rounded-full border px-[15px] py-2.5 text-[12.5px] ${
                dias === r ? 'border-navy bg-navy text-white' : 'border-navy/[0.18] bg-white text-muted'
              }`}
            >
              {r} días
            </Link>
          ))}
        </nav>
      </header>

      <div className="grid grid-cols-4 gap-3.5">
        {stats.map(s => (
          <div
            key={s.label}
            className={`flex flex-col gap-[7px] rounded-2xl p-5 ${s.featured ? 'bg-navy' : 'bg-bone'}`}
          >
            <span className={`font-serif text-[34px] leading-none ${s.featured ? 'text-white' : ''}`}>
              {s.value}
            </span>
            <span
              className={`text-[10.5px] uppercase tracking-[0.14em] ${
                s.featured ? 'text-white/60' : 'text-label'
              }`}
            >
              {s.label}
            </span>
            <span
              className={`text-[12.5px] ${
                s.featured ? 'text-white/70' : s.deltaTone === 'green' ? 'text-green' : 'text-muted'
              }`}
            >
              {s.delta}
            </span>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-[18px] rounded-2xl border border-navy/10 p-[22px]">
        <h2 className="text-[10.5px] uppercase tracking-[0.18em] text-label">Vistas por semana</h2>
        <div className="flex h-[150px] items-end gap-[9px]">
          {weeks.map((w, i) => (
            <div key={w.label} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div
                className={`w-full rounded-t-[5px] ${i === weeks.length - 1 ? 'bg-navy' : 'bg-navy/[0.16]'}`}
                style={{ height: `${Math.round((w.count / max) * 122)}px` }}
                title={`${w.count} vistas`}
              />
              <span className="text-[9.5px] text-navy/25">{w.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-start gap-3.5">
        <section className="flex flex-1 flex-col gap-3.5 rounded-2xl border border-navy/10 p-[22px]">
          <h2 className="text-[10.5px] uppercase tracking-[0.18em] text-label">Ranking de tarjetas</h2>
          {ranking.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">Sin vistas en este período.</p>
          ) : (
            <ol className="flex flex-col">
              {ranking.map((r, i) => (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/${orgSlug}/cards/${r.id}/edit`}
                    className="flex items-center gap-[13px] border-b border-navy/[0.07] py-3"
                  >
                    <span className="w-[18px] flex-none font-serif text-[15px] text-navy/25">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-[13.5px]">{r.name}</span>
                      <span className="mt-[3px] h-1 overflow-hidden rounded-sm bg-bone">
                        <span
                          className="block h-full"
                          style={{
                            width: `${Math.round((r.views / topViews) * 100)}%`,
                            background: org.primaryColor ?? '#13263F',
                          }}
                        />
                      </span>
                    </span>
                    <span className="flex-none text-[13px] text-muted">{fmt(r.views)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="flex w-[340px] flex-none flex-col gap-3.5 rounded-2xl border border-navy/10 p-[22px]">
          <h2 className="text-[10.5px] uppercase tracking-[0.18em] text-label">Clicks por tipo de link</h2>
          {byKind.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">Sin clicks en este período.</p>
          ) : (
            <ul className="flex flex-col">
              {byKind.map(k => (
                <li
                  key={k.kind}
                  className="flex items-center justify-between gap-3 border-b border-navy/[0.07] py-3"
                >
                  <span className="text-[13.5px]">{KIND_LABELS[k.kind] ?? k.kind}</span>
                  <span className="flex items-center gap-[11px]">
                    <span className="h-1 w-[74px] overflow-hidden rounded-sm bg-bone">
                      <span
                        className="block h-full"
                        style={{
                          width: `${Math.round((k.clicks / topClicks) * 100)}%`,
                          background: k.kind === 'whatsapp' ? '#2F7A5B' : org.primaryColor ?? '#13263F',
                        }}
                      />
                    </span>
                    <span className="w-[34px] text-right text-[12.5px] text-muted">{fmt(k.clicks)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------- queries ---------- */

async function viewsByWeek(orgId: string) {
  const rows = await prisma.$queryRaw<{ week: Date; count: bigint }[]>`
    SELECT date_trunc('week', v."viewedAt") AS week, COUNT(*) AS count
    FROM "CardView" v
    JOIN "Profile" p ON p.id = v."profileId"
    WHERE p."organizationId" = ${orgId}
      AND v."viewedAt" > now() - interval '12 weeks'
    GROUP BY 1 ORDER BY 1
  `;
  return rows.map((r, i) => ({ label: `S${i + 1}`, count: Number(r.count) }));
}

async function cardRanking(orgId: string, since: Date) {
  const grouped = await prisma.cardView.groupBy({
    by: ['profileId'],
    where: { profile: { organizationId: orgId }, viewedAt: { gt: since } },
    _count: { _all: true },
    orderBy: { _count: { profileId: 'desc' } },
    take: 6,
  });

  const profiles = await prisma.profile.findMany({
    where: { id: { in: grouped.map(g => g.profileId) } },
    select: { id: true, displayName: true },
  });

  const names = new Map(profiles.map(p => [p.id, p.displayName]));
  return grouped.map(g => ({
    id:    g.profileId,
    name:  names.get(g.profileId) ?? '—',
    views: g._count._all,
  }));
}

async function clicksByKind(orgId: string, since: Date) {
  const rows = await prisma.$queryRaw<{ kind: string; clicks: bigint }[]>`
    SELECT l.kind, COUNT(*) AS clicks
    FROM "LinkClick" c
    JOIN "ProfileLink" l ON l.id = c."linkId"
    JOIN "Profile" p ON p.id = l."profileId"
    WHERE p."organizationId" = ${orgId} AND c."clickedAt" > ${since}
    GROUP BY 1 ORDER BY 2 DESC
  `;
  return rows.map(r => ({ kind: r.kind, clicks: Number(r.clicks) }));
}

const fmt = (n: number) => n.toLocaleString('es-AR');
const pct = (a: number, b: number) => (b === 0 ? '0%' : `${Math.round((a / b) * 100)}%`);
