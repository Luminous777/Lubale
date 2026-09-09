// app/dashboard/[orgSlug]/team/page.tsx — Server Component
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';
import InviteForm from './InviteForm';
import MemberRow from './MemberRow';
import { resendInvite, revokeInvite } from './actions';

export default async function TeamPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, isAdmin, user } = await requireMembership(orgSlug);

  if (!isAdmin) notFound();

  const [members, invites, profiles] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: org.id },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      include: {
        user:    { select: { id: true, name: true, email: true } },
        profile: { select: { cardSlug: true, displayName: true } },
      },
    }),
    prisma.invitation.findMany({
      where: { organizationId: org.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.profile.findMany({
      where:   { organizationId: org.id },
      select:  { id: true, displayName: true, cardSlug: true, ownerUserId: true },
      orderBy: { displayName: 'asc' },
    }),
  ]);

  const used      = members.filter(m => m.status !== 'disabled').length;
  const seats     = org.seats ?? 1;
  const seatsLeft = seats - used;

  return (
    <div className="flex flex-col gap-5 px-9 pb-11 pt-8">
      <header className="flex items-end justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] leading-[1.1]">Equipo</h1>
          <p className="text-[13.5px] text-muted">
            {used} de {seats} asientos en uso
            {invites.length > 0 &&
              ` · ${invites.length} invitación${invites.length > 1 ? 'es' : ''} pendiente${invites.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <a
          href={`/dashboard/${orgSlug}/billing`}
          className="rounded-[11px] border border-navy/[0.16] px-[18px] py-3 text-[13.5px] hover:bg-bone"
        >
          Comprar asientos
        </a>
      </header>

      {seatsLeft <= 0 && (
        <div className="flex items-center justify-between gap-6 rounded-2xl border border-gold/40 bg-gold/[0.07] px-6 py-5">
          <span className="flex flex-col gap-1">
            <span className="text-[14.5px] font-medium">No te quedan asientos libres</span>
            <span className="text-[13px] text-muted">
              Sumá un asiento individual por $1.099/mes o pasá a un plan con más lugares.
            </span>
          </span>
          <a href={`/dashboard/${orgSlug}/billing`} className="flex-none text-[13.5px] text-gold">
            Ver opciones →
          </a>
        </div>
      )}

      <div className="flex items-start gap-3.5">
        <section className="flex-1 overflow-hidden rounded-2xl border border-navy/10">
          <div className="grid grid-cols-[1.5fr_1.4fr_0.8fr_1fr_0.7fr_40px] gap-3.5 bg-bone px-5 py-[13px] text-[10px] uppercase tracking-[0.14em] text-label">
            <span>Miembro</span>
            <span>Email</span>
            <span>Rol</span>
            <span>Tarjeta</span>
            <span>Estado</span>
            <span />
          </div>
          {members.map(m => (
            <MemberRow
              key={m.id}
              orgSlug={orgSlug}
              isSelf={m.userId === user.id}
              adminCount={members.filter(x => x.role === 'admin' && x.status === 'active').length}
              member={{
                id:       m.id,
                name:     m.user.name ?? '—',
                email:    m.user.email,
                role:     m.role,
                status:   m.status,
                cardSlug: m.profile?.cardSlug ?? null,
                cardName: m.profile?.displayName ?? null,
              }}
              profiles={profiles.map(p => ({ id: p.id, label: p.displayName, slug: p.cardSlug }))}
            />
          ))}
        </section>

        <div className="flex w-[330px] flex-none flex-col gap-3.5">
          <InviteForm
            orgSlug={orgSlug}
            seatsLeft={seatsLeft}
            profiles={profiles
              .filter(p => !p.ownerUserId)
              .map(p => ({ id: p.id, label: p.displayName }))}
          />

          {invites.length > 0 && (
            <section className="flex flex-col gap-3 rounded-2xl border border-navy/10 p-5">
              <h2 className="text-[10.5px] uppercase tracking-[0.16em] text-label">
                Invitaciones pendientes
              </h2>
              <ul className="flex flex-col">
                {invites.map(i => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between gap-2.5 border-b border-navy/[0.07] py-2.5"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[13px]">{i.email}</span>
                      <span className="text-[11.5px] text-gold">{expiryLabel(i.expiresAt)}</span>
                    </span>
                    <span className="flex flex-none gap-1.5">
                      <form action={resendInvite}>
                        <input type="hidden" name="inviteId" value={i.id} />
                        <input type="hidden" name="orgSlug"  value={orgSlug} />
                        <button className="rounded-lg border border-navy/[0.16] px-2.5 py-1.5 text-[11.5px] text-muted">
                          Renovar
                        </button>
                      </form>
                      <form action={revokeInvite}>
                        <input type="hidden" name="inviteId" value={i.id} />
                        <input type="hidden" name="orgSlug"  value={orgSlug} />
                        <button className="rounded-lg border border-navy/[0.16] px-2.5 py-1.5 text-[11.5px] text-muted">
                          ✕
                        </button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function expiryLabel(date: Date) {
  const days = Math.ceil((date.getTime() - Date.now()) / 864e5);
  if (days <= 0) return 'vencida';
  if (days === 1) return 'vence mañana';
  return `vence en ${days} días`;
}
