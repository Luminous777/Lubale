// app/dashboard/[orgSlug]/leads/page.tsx — Server Component
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';
import LeadRow from './LeadRow';

type Estado = 'todos' | 'nuevo' | 'evento' | 'contactado';

const PAGE_SIZE = 25;

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ estado?: Estado; q?: string; page?: string }>;
}) {
  const { orgSlug } = await params;
  const { estado = 'todos', q = '', page = '1' } = await searchParams;
  const { org, isAdmin, user } = await requireMembership(orgSlug);

  const pageNum = Math.max(1, Number(page) || 1);

  const where = {
    profile: {
      organizationId: org.id,
      // un agente solo ve los contactos de su propia tarjeta
      ...(isAdmin ? {} : { ownerUserId: user.id }),
    },
    ...(estado !== 'todos' ? { status: estado } : {}),
    ...(q
      ? {
          OR: [
            { name:    { contains: q, mode: 'insensitive' as const } },
            { email:   { contains: q, mode: 'insensitive' as const } },
            { company: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [leads, total, counts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { profile: { select: { displayName: true, cardSlug: true } } },
    }),
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ['status'],
      where: { profile: { organizationId: org.id, ...(isAdmin ? {} : { ownerUserId: user.id }) } },
      _count: { _all: true },
    }),
  ]);

  const countOf = (s: string) => counts.find(c => c.status === s)?._count._all ?? 0;
  const allCount = counts.reduce((sum, c) => sum + c._count._all, 0);

  const filters: { key: Estado; label: string; count: number }[] = [
    { key: 'todos',      label: 'Todos',       count: allCount          },
    { key: 'nuevo',      label: 'Nuevos',      count: countOf('nuevo')      },
    { key: 'evento',     label: 'Evento',      count: countOf('evento')     },
    { key: 'contactado', label: 'Contactados', count: countOf('contactado') },
  ];

  const qs = (over: Record<string, string>) =>
    new URLSearchParams({ estado, q, page: String(pageNum), ...over }).toString();

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-5 px-9 pb-11 pt-8">
      <header className="flex items-end justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] leading-[1.1]">Contactos</h1>
          <p className="text-[13.5px] text-muted">
            {isAdmin
              ? 'Personas que dejaron sus datos en las tarjetas del equipo'
              : 'Personas que dejaron sus datos en tu tarjeta'}
          </p>
        </div>
        <div className="flex gap-2.5">
          <a
            href={`/api/leads/export?org=${orgSlug}&estado=${estado}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className="rounded-[11px] border border-navy/[0.16] px-[18px] py-3 text-[13.5px] hover:bg-bone"
          >
            Exportar CSV
          </a>
          <Link
            href={`/dashboard/${orgSlug}/settings/integrations`}
            className="rounded-[11px] bg-navy px-[18px] py-3 text-[13.5px] text-white"
          >
            Conectar CRM
          </Link>
        </div>
      </header>

      <form className="flex items-center gap-2.5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, empresa o email"
          className="h-[42px] flex-1 rounded-[11px] bg-bone px-[15px] text-[13.5px] outline-none placeholder:text-label"
        />
        <input type="hidden" name="estado" value={estado} />
        {filters.map(f => (
          <Link
            key={f.key}
            href={`/dashboard/${orgSlug}/leads?${qs({ estado: f.key, page: '1' })}`}
            className={`flex items-center gap-2 rounded-full border px-4 py-[11px] text-[12.5px] ${
              estado === f.key
                ? 'border-navy bg-navy text-white'
                : 'border-navy/[0.18] bg-white text-muted'
            }`}
          >
            {f.label}
            <span className={estado === f.key ? 'text-white/60' : 'text-navy/30'}>{f.count}</span>
          </Link>
        ))}
      </form>

      {leads.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-navy/20 py-16 text-center">
          <p className="max-w-sm text-[13.5px] leading-[1.7] text-muted">
            {q
              ? `Sin resultados para "${q}".`
              : 'Todavía nadie dejó sus datos. Aparecen acá en cuanto alguien completa el formulario de una tarjeta.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-navy/10">
            <div className="grid grid-cols-[1.4fr_1.2fr_1fr_1fr_0.8fr_0.9fr] gap-3.5 bg-bone px-5 py-[13px] text-[10px] uppercase tracking-[0.14em] text-label">
              <span>Contacto</span>
              <span>Email</span>
              <span>Tarjeta</span>
              <span>Origen</span>
              <span>Fecha</span>
              <span>Estado</span>
            </div>
            {leads.map(l => (
              <LeadRow
                key={l.id}
                orgSlug={orgSlug}
                lead={{
                  id:        l.id,
                  name:      l.name,
                  company:   l.company,
                  email:     l.email ?? '',
                  phone:     l.phone,
                  note:      l.note,
                  status:    l.status,
                  source:    l.source ?? 'Link compartido',
                  createdAt: l.createdAt.toISOString(),
                  cardName:  l.profile.displayName,
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-[12.5px] text-label">
            <span>
              {total} {total === 1 ? 'contacto' : 'contactos'} · mostrando {leads.length}
            </span>
            <div className="flex gap-2">
              <PageLink
                href={`/dashboard/${orgSlug}/leads?${qs({ page: String(pageNum - 1) })}`}
                disabled={pageNum <= 1}
              >
                Anterior
              </PageLink>
              <PageLink
                href={`/dashboard/${orgSlug}/leads?${qs({ page: String(pageNum + 1) })}`}
                disabled={pageNum >= lastPage}
              >
                Siguiente
              </PageLink>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled)
    return (
      <span className="rounded-lg border border-navy/[0.14] px-[13px] py-2 opacity-40">{children}</span>
    );
  return (
    <Link href={href} className="rounded-lg border border-navy/[0.14] px-[13px] py-2 hover:bg-bone">
      {children}
    </Link>
  );
}
