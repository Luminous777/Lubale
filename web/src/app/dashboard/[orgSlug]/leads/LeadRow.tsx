'use client';

import { useState, useTransition } from 'react';
import { setLeadStatus } from './actions';

type Lead = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  note: string | null;
  status: string;
  source: string;
  createdAt: string;
  cardName: string;
};

const STATES = [
  { key: 'nuevo',      label: 'Nuevo',      bg: 'bg-green/10',      fg: 'text-green' },
  { key: 'evento',     label: 'Evento',     bg: 'bg-gold/[0.14]',   fg: 'text-gold'  },
  { key: 'contactado', label: 'Contactado', bg: 'bg-navy/[0.07]',   fg: 'text-muted' },
];

export default function LeadRow({ orgSlug, lead }: { orgSlug: string; lead: Lead }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(lead.status);
  const [pending, start] = useTransition();

  const state = STATES.find(s => s.key === status) ?? STATES[2];
  const initials = lead.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const change = (next: string) => {
    setStatus(next);
    start(() => setLeadStatus({ orgSlug, leadId: lead.id, status: next }));
  };

  return (
    <div className="border-t border-navy/[0.07]">
      <button
        onClick={() => setOpen(o => !o)}
        className="grid w-full grid-cols-[1.4fr_1.2fr_1fr_1fr_0.8fr_0.9fr] items-center gap-3.5 px-5 py-[15px] text-left text-[13px] hover:bg-[#FCFBF9]"
      >
        <span className="flex min-w-0 items-center gap-[11px]">
          <span className="grid size-8 flex-none place-items-center rounded-full bg-bone font-serif text-xs">
            {initials}
          </span>
          <span className="flex min-w-0 flex-col gap-px">
            <span className="truncate">{lead.name}</span>
            <span className="truncate text-[11.5px] text-label">{lead.company ?? '—'}</span>
          </span>
        </span>
        <span className="truncate text-muted">{lead.email}</span>
        <span className="truncate text-muted">{lead.cardName}</span>
        <span className="truncate text-muted">{lead.source}</span>
        <span className="text-xs text-label">
          {new Date(lead.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
        </span>
        <span>
          <span
            className={`rounded-full px-2.5 py-1 text-[9.5px] uppercase tracking-[0.1em] ${state.bg} ${state.fg}`}
          >
            {state.label}
          </span>
        </span>
      </button>

      {open && (
        <div className="flex items-start gap-6 border-t border-navy/[0.07] bg-[#FCFBF9] px-5 py-[18px]">
          <dl className="flex flex-1 flex-col gap-2.5">
            {lead.phone && (
              <div className="flex gap-3 text-[12.5px]">
                <dt className="w-[70px] flex-none uppercase tracking-[0.14em] text-label">Teléfono</dt>
                <dd>{lead.phone}</dd>
              </div>
            )}
            {lead.note && (
              <div className="flex gap-3 text-[12.5px]">
                <dt className="w-[70px] flex-none uppercase tracking-[0.14em] text-label">Nota</dt>
                <dd className="leading-[1.6] text-muted">{lead.note}</dd>
              </div>
            )}
            <div className="mt-1 flex gap-2">
              <a
                href={`mailto:${lead.email}`}
                className="rounded-[9px] border border-navy/[0.16] bg-white px-3.5 py-2 text-[12.5px]"
              >
                Escribir email
              </a>
              {lead.phone && (
                <a
                  href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[9px] border border-navy/[0.16] bg-white px-3.5 py-2 text-[12.5px]"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </dl>

          <div className="flex w-[260px] flex-none flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-label">Estado</span>
            <div className={`flex gap-1.5 ${pending ? 'opacity-60' : ''}`}>
              {STATES.map(s => (
                <button
                  key={s.key}
                  onClick={() => change(s.key)}
                  className={`flex-1 rounded-[9px] border py-2 text-[11.5px] ${
                    status === s.key
                      ? 'border-navy bg-navy text-white'
                      : 'border-navy/[0.16] bg-white text-muted'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
