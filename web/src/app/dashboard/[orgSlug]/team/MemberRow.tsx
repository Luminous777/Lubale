'use client';

import { useState, useTransition } from 'react';
import { setMemberRole, setMemberStatus, assignCard } from './actions';

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  cardSlug: string | null;
  cardName: string | null;
};

export default function MemberRow({
  orgSlug,
  member,
  isSelf,
  adminCount,
  profiles,
}: {
  orgSlug: string;
  member: Member;
  isSelf: boolean;
  adminCount: number;
  profiles: { id: string; label: string; slug: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const [pending, start] = useTransition();

  const lastAdmin = role === 'admin' && adminCount <= 1;

  const stateTone =
    status === 'active'   ? 'text-green' :
    status === 'invited'  ? 'text-gold'  : 'text-label';
  const stateLabel =
    status === 'active'   ? 'Activo'      :
    status === 'invited'  ? 'Invitado'    : 'Desactivado';

  return (
    <div className="border-t border-navy/[0.07]">
      <div className="grid grid-cols-[1.5fr_1.4fr_0.8fr_1fr_0.7fr_40px] items-center gap-3.5 px-5 py-[15px] text-[13px]">
        <span className="flex min-w-0 items-center gap-[11px]">
          <span className="size-8 flex-none rounded-full bg-bone" />
          <span className="truncate">
            {member.name}
            {isSelf && <span className="ml-1.5 text-[11.5px] text-label">(vos)</span>}
          </span>
        </span>
        <span className="truncate text-muted">{member.email}</span>
        <span>
          <span
            className={`rounded-full px-2.5 py-1 text-[9.5px] uppercase tracking-[0.1em] ${
              role === 'admin' ? 'bg-navy text-white' : 'bg-navy/[0.07] text-muted'
            }`}
          >
            {role === 'admin' ? 'Admin' : 'Agente'}
          </span>
        </span>
        <span className="truncate text-muted">
          {member.cardSlug ? `/${member.cardSlug}` : 'Sin asignar'}
        </span>
        <span className={`text-xs ${stateTone}`}>{stateLabel}</span>
        <button onClick={() => setOpen(o => !o)} className="text-navy/30 hover:text-navy">
          {open ? '▴' : '▾'}
        </button>
      </div>

      {open && (
        <div
          className={`flex gap-8 border-t border-navy/[0.07] bg-[#FCFBF9] px-5 py-[18px] ${
            pending ? 'opacity-60' : ''
          }`}
        >
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-label">Rol</span>
            <div className="flex gap-1.5">
              {(['agent', 'admin'] as const).map(r => (
                <button
                  key={r}
                  disabled={lastAdmin && r === 'agent'}
                  onClick={() => {
                    setRole(r);
                    start(() => setMemberRole({ orgSlug, membershipId: member.id, role: r }));
                  }}
                  className={`rounded-[9px] border px-3.5 py-2 text-[11.5px] disabled:opacity-40 ${
                    role === r ? 'border-navy bg-navy text-white' : 'border-navy/[0.16] bg-white text-muted'
                  }`}
                >
                  {r === 'admin' ? 'Admin' : 'Agente'}
                </button>
              ))}
            </div>
            {lastAdmin && (
              <span className="text-[11px] text-label">Es el único admin — no se puede bajar.</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-label">Tarjeta asignada</span>
            <select
              defaultValue={profiles.find(p => p.slug === member.cardSlug)?.id ?? ''}
              onChange={e =>
                start(() =>
                  assignCard({ orgSlug, membershipId: member.id, profileId: e.target.value || null })
                )
              }
              className="h-9 rounded-[9px] border border-navy/[0.16] bg-white px-3 text-[12.5px] outline-none"
            >
              <option value="">Sin asignar</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {!isSelf && (
            <div className="ml-auto flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-label">Acceso</span>
              <button
                onClick={() => {
                  const next = status === 'disabled' ? 'active' : 'disabled';
                  setStatus(next);
                  start(() => setMemberStatus({ orgSlug, membershipId: member.id, status: next }));
                }}
                className="rounded-[9px] border border-navy/[0.16] bg-white px-3.5 py-2 text-[11.5px] text-muted"
              >
                {status === 'disabled' ? 'Reactivar' : 'Desactivar'}
              </button>
              <span className="max-w-[180px] text-[11px] leading-[1.5] text-label">
                Su tarjeta sigue online; pierde el acceso al panel.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
