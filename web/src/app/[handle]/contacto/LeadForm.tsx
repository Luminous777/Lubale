'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitLead } from './actions';

const FIELDS = [
  { name: 'name',    label: 'Nombre y apellido', placeholder: 'Mariano Gómez',                  autoComplete: 'name',         required: true },
  { name: 'email',   label: 'Email',              placeholder: 'mariano@constructoradelta.com', type: 'email', autoComplete: 'email' },
  { name: 'phone',   label: 'Teléfono',           placeholder: '+54 9 11 …',                   type: 'tel',   autoComplete: 'tel' },
  { name: 'company', label: 'Empresa',            placeholder: 'Constructora Delta',            autoComplete: 'organization' },
] as const;

export default function LeadForm({
  profileId,
  handle,
  ownerFirstName,
}: {
  profileId: string;
  handle: string;
  ownerFirstName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [note, setNote] = useState('');
  const [wantsCard, setWantsCard] = useState(true);

  const valid = form.name.trim().length > 1 && /\S+@\S+\.\S+/.test(form.email);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || pending) return;
    setError(null);
    start(async () => {
      const res = await submitLead({ profileId, ...form, note, wantsCard });
      if (!res.ok) {
        setError(res.error ?? 'No pudimos enviar tus datos. Probá de nuevo.');
        return;
      }
      const q = new URLSearchParams({
        de:      handle,
        name:    form.name,
        email:   form.email,
        company: form.company,
      });
      router.replace(`/enviado?${q}`);
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[15px] px-9 pb-8 pt-[26px]" noValidate>
      <div className="grid grid-cols-2 gap-[15px]">
        {FIELDS.map(f => (
          <label key={f.name} className="flex flex-col gap-[7px]">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">
              {f.label}
              {f.required && <span className="text-gold"> *</span>}
            </span>
            <input
              type={f.type ?? 'text'}
              name={f.name}
              value={form[f.name]}
              onChange={e => setForm(s => ({ ...s, [f.name]: e.target.value }))}
              placeholder={f.placeholder}
              autoComplete={f.autoComplete}
              className="h-12 rounded-[11px] border border-navy/[0.16] px-[15px] text-[14.5px] text-navy outline-none placeholder:text-navy/25 focus:border-navy/50 focus:ring-0"
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-[7px]">
        <span className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">Nota (opcional)</span>
          <span className="text-[11px] text-navy/25">{note.length}/200</span>
        </span>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value.slice(0, 200))}
          placeholder="Nos conocimos en…"
          rows={3}
          className="resize-none rounded-[11px] border border-navy/[0.16] px-[15px] py-[13px] text-sm leading-[1.55] text-navy outline-none placeholder:text-navy/25 focus:border-navy/50"
        />
      </label>

      <button
        type="button"
        onClick={() => setWantsCard(v => !v)}
        className="mt-0.5 flex items-start gap-[11px] text-left"
      >
        <span
          className={`grid size-5 flex-none place-items-center rounded-[5px] border text-xs text-white transition ${
            wantsCard ? 'border-navy bg-navy' : 'border-navy/20'
          }`}
        >
          {wantsCard && '✓'}
        </span>
        <span className="text-[12.5px] leading-[1.6] text-muted">
          Quiero recibir la tarjeta de {ownerFirstName} por email.
        </span>
      </button>

      {error && <p className="text-[12.5px] text-gold">{error}</p>}

      <button
        type="submit"
        disabled={!valid || pending}
        className="mt-1.5 grid h-[54px] place-items-center rounded-[13px] bg-navy text-[15.5px] font-medium text-white transition hover:bg-navy-deep disabled:opacity-35"
      >
        {pending ? 'Enviando…' : 'Enviar mis datos'}
      </button>

      <p className="text-center text-xs leading-[1.6] text-navy/30">
        Protegido por LUBELA · lubela.app/{handle}
      </p>
    </form>
  );
}
