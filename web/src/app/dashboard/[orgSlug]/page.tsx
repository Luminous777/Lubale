// app/dashboard/[orgSlug]/page.tsx — Resumen
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';

export default async function OverviewPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, user } = await requireMembership(orgSlug);

  const since = new Date(Date.now() - 30 * 864e5);
  const scope = { profile: { organizationId: org.id } };

  const [views, clicks, leads, newLeads, cardCount, disabledCount, recent, weeks] = await Promise.all([
    prisma.cardView.count({ where: { ...scope, viewedAt: { gt: since } } }),
    prisma.linkClick.count({
      where: { link: { profile: { organizationId: org.id } }, clickedAt: { gt: since } },
    }),
    prisma.lead.count({ where: scope }),
    prisma.lead.count({ where: { ...scope, status: 'nuevo' } }),
    prisma.profile.count({ where: { organizationId: org.id } }),
    prisma.profile.count({ where: { organizationId: org.id, status: 'disabled' } }),
    prisma.profile.findMany({
      where: { organizationId: org.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { _count: { select: { views: true } } },
    }),
    weeklyViews(org.id),
  ]);

  const max = Math.max(...weeks.map(w => w.count), 1);

  const stats = [
    { value: fmt(views), label: 'Vistas', delta: 'últimos 30 días', accent: false },
    { value: fmt(clicks), label: 'Clicks en links', delta: `${pct(clicks, views)} de las vistas`, accent: false },
    { value: fmt(leads), label: 'Contactos', delta: `${newLeads} sin responder`, accent: newLeads > 0 },
    { value: fmt(cardCount), label: 'Tarjetas', delta: `${disabledCount} desactivadas`, accent: false },
  ];

  return (
    <div className="flex flex-col gap-[22px] px-9 pb-11 pt-8">
      <header className="flex items-end justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] leading-[1.1]">
            Buen día, {user.name?.split(' ')[0] ?? 'hola'}
          </h1>
          <p className="text-[13.5px] text-muted">
            {org.name} · {org._count.memberships} miembros · {cardCount - disabledCount} tarjetas activas
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            href={`/dashboard/${orgSlug}/cards/new`}
            className="rounded-[11px] border border-navy/[0.16] px-[18px] py-3 text-[13.5px] hover:bg-bone"
          >
            Nueva tarjeta
          </Link>
          <Link
            href={`/dashboard/${orgSlug}/leads`}
            className="rounded-[11px] bg-navy px-[18px] py-3 text-[13.5px] text-white"
          >
            Ver contactos
          </Link>
        </div>
      </header>

      {newLeads > 0 && (
        <Link
          href={`/dashboard/${orgSlug}/leads?estado=nuevo`}
          className="flex items-center justify-between gap-6 rounded-2xl bg-navy px-6 py-5"
        >
          <span className="flex items-center gap-4">
            <span className="rounded-full bg-gold px-3 py-[5px] text-[10px] uppercase tracking-[0.14em] text-white">
              {newLeads} {newLeads === 1 ? 'nuevo' : 'nuevos'}
            </span>
            <span className="text-[14.5px] text-white">
              {newLeads === 1
                ? 'Tenés un contacto sin responder.'
                : `Tenés ${newLeads} contactos sin responder.`}
            </span>
          </span>
          <span className="text-[13.5px] text-white/70">Revisar →</span>
        </Link>
      )}

      {org.plan === 'free' && (
        <Link
          href={`/dashboard/${orgSlug}/billing`}
          className="flex items-center justify-between gap-6 rounded-2xl border border-gold/40 bg-gold/[0.07] px-6 py-5"
        >
          <span className="flex flex-col gap-1">
            <span className="text-[14.5px] font-medium">Estás en el plan Esencial</span>
            <span className="text-[13px] text-muted">
              Sumá links ilimitados, colores propios y contactos recibidos.
            </span>
          </span>
          <span className="flex-none text-[13.5px] text-gold">Ver planes →</span>
        </Link>
      )}

      <div className="grid grid-cols-4 gap-3.5">
        {stats.map(s => (
          <div key={s.label} className="flex flex-col gap-[7px] rounded-2xl bg-bone p-5">
            <span className="font-serif text-[34px] leading-none">{s.value}</span>
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-label">{s.label}</span>
            <span className={`text-[12.5px] ${s.accent ? 'text-gold' : 'text-muted'}`}>{s.delta}</span>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3.5">
        <section className="flex flex-1 flex-col gap-[18px] rounded-2xl border border-navy/10 p-[22px]">
          <header className="flex items-center justify-between">
            <h2 className="text-[10.5px] uppercase tracking-[0.18em] text-label">
              Escaneos · últimos 30 días
            </h2>
            <Link href={`/dashboard/${orgSlug}/analytics`} className="text-[12.5px] text-muted">
              Ver analítica →
            </Link>
          </header>
          <div className="flex h-32 items-end gap-[9px]">
            {weeks.map((w, i) => (
              <div key={w.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                <div
                  className={`w-full rounded-t-[5px] ${
                    i === weeks.length - 1 ? 'bg-navy' : 'bg-navy/[0.16]'
                  }`}
                  style={{ height: `${Math.round((w.count / max) * 100)}px` }}
                />
                <span className="text-[9.5px] text-navy/25">{w.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex w-[330px] flex-none flex-col gap-3.5 rounded-2xl border border-navy/10 p-[22px]">
          <h2 className="text-[10.5px] uppercase tracking-[0.18em] text-label">Tarjetas recientes</h2>
          <ul className="flex flex-col">
            {recent.map(c => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/${orgSlug}/cards/${c.id}/edit`}
                  className="flex items-center gap-[11px] border-b border-navy/[0.07] py-[11px]"
                >
                  <span
                    className="grid size-[34px] flex-none place-items-center rounded-[9px] font-serif text-[13px] text-white"
                    style={{ backgroundColor: org.primaryColor ?? '#13263F' }}
                  >
                    {initials(c.displayName)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13.5px]">{c.displayName}</span>
                    <span className="text-[11.5px] text-label">/{c.cardSlug}</span>
                  </span>
                  <span className="text-xs text-muted">{fmt(c._count.views)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* helpers */

async function weeklyViews(orgId: string) {
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

const fmt = (n: number) => n.toLocaleString('es-AR');
const pct = (a: number, b: number) => (b === 0 ? '0%' : `${Math.round((a / b) * 100)}%`);
const initials = (n: string) => n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
