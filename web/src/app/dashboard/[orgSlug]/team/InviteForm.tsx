'use client';

import { useState, useTransition } from 'react';
import { inviteMember } from './actions';

export default function InviteForm({
  orgSlug,
  seatsLeft,
  profiles,
}: {
  orgSlug: string;
  seatsLeft: number;
  profiles: { id: string; label: string }[];
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'agent' | 'admin'>('agent');
  const [profileId, setProfileId] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [pending, start] = useTransition();

  const valid = /\S+@\S+\.\S+/.test(email) && seatsLeft > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || pending) return;
    setMsg(null);
    start(async () => {
      const res = await inviteMember({ orgSlug, email, role, profileId: profileId || null });
      if (res.ok) {
        setEmail('');
        setProfileId('');
        setMsg({ tone: 'ok', text: 'Invitación enviada.' });
      } else {
        setMsg({ tone: 'err', text: res.error ?? 'No se pudo invitar.' });
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5 rounded-2xl bg-navy p-5 text-white">
      <h2 className="font-serif text-[22px]">Invitar a alguien</h2>

      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="email@empresa.com"
        autoComplete="off"
        className="h-11 rounded-[10px] border border-white/[0.22] bg-transparent px-3.5 text-[13.5px] text-white outline-none placeholder:text-white/40 focus:border-white/50"
      />

      <div className="flex gap-2">
        <select
          value={role}
          onChange={e => setRole(e.target.value as 'agent' | 'admin')}
          className="h-11 flex-1 appearance-none rounded-[10px] border border-white/[0.22] bg-transparent px-3.5 text-[13.5px] text-white/80 outline-none"
        >
          <option value="agent" className="text-navy">Agente</option>
          <option value="admin" className="text-navy">Admin</option>
        </select>
        <select
          value={profileId}
          onChange={e => setProfileId(e.target.value)}
          className="h-11 flex-1 appearance-none rounded-[10px] border border-white/[0.22] bg-transparent px-3.5 text-[13.5px] text-white/80 outline-none"
        >
          <option value="" className="text-navy">Tarjeta nueva</option>
          {profiles.map(p => (
            <option key={p.id} value={p.id} className="text-navy">
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <button
        disabled={!valid || pending}
        className="grid h-[46px] place-items-center rounded-[10px] bg-white text-sm font-medium text-navy disabled:opacity-40"
      >
        {pending ? 'Enviando…' : 'Enviar invitación'}
      </button>

      {msg && (
        <p className={`text-[12px] ${msg.tone === 'ok' ? 'text-white/70' : 'text-gold'}`}>{msg.text}</p>
      )}
      {seatsLeft <= 0 && (
        <p className="text-[12px] leading-[1.55] text-white/50">
          Sin asientos libres. Comprá uno antes de invitar.
        </p>
      )}
      <p className="text-[11.5px] leading-[1.55] text-white/45">
        Un agente edita solo su tarjeta y ve solo sus contactos. Los admins ven todo.
      </p>
    </form>
  );
}
