'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { claimCard, checkSlug } from './actions';

type Initial = { name: string; email: string; company: string; slug: string };
type SlugState = 'idle' | 'checking' | 'free' | 'taken';

export default function ClaimForm({ initial, trial }: { initial: Initial; trial: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [slugState, setSlugState] = useState<SlugState>('idle');

  const set = (k: keyof Initial, v: string) => {
    setForm(s => ({ ...s, [k]: v }));
    setTouched(t => ({ ...t, [k]: true }));
  };

  // Disponibilidad del link con debounce
  useEffect(() => {
    if (form.slug.length < 3) return setSlugState('idle');
    setSlugState('checking');
    const t = setTimeout(async () => {
      const free = await checkSlug(form.slug);
      setSlugState(free ? 'free' : 'taken');
    }, 400);
    return () => clearTimeout(t);
  }, [form.slug]);

  const valid =
    form.name.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.slug.length > 2 &&
    slugState !== 'taken';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || pending) return;
    setError(null);
    start(async () => {
      const res = await claimCard({ ...form, trial });
      if (!res.ok) return setError(res.error ?? 'No pudimos crear la cuenta. Probá de nuevo.');
      router.replace(`/magic-link-sent?email=${encodeURIComponent(form.email)}`);
    });
  };

  const fields = [
    { key: 'name'    as const, label: 'Nombre y apellido', autoComplete: 'name' },
    { key: 'email'   as const, label: 'Email',             type: 'email', autoComplete: 'email' },
    { key: 'company' as const, label: 'Empresa',           autoComplete: 'organization' },
  ];

  const slugHint = {
    idle:     null,
    checking: { text: 'verificando…',  color: 'text-label' },
    free:     { text: 'disponible',    color: 'text-green' },
    taken:    { text: 'ya está en uso', color: 'text-gold' },
  }[slugState];

  return (
    <main className="flex min-h-dvh bg-white">
      {/* Formulario */}
      <form onSubmit={onSubmit} className="flex flex-1 flex-col px-12 py-11" noValidate>
        {trial && (
          <div className="mb-[22px] flex items-center gap-2.5">
            <span className="rounded-full bg-navy px-[13px] py-1.5 text-[10px] uppercase tracking-[0.16em] text-white">
              Pro · 30 días
            </span>
            <span className="text-[12.5px] text-label">sin tarjeta de crédito</span>
          </div>
        )}

        <h1 className="mb-[9px] font-serif text-[40px] leading-[1.12]">Confirmá y es tuya</h1>
        <p className="mb-7 max-w-[420px] text-[14.5px] leading-[1.6] text-muted">
          Traído del formulario que acabás de llenar. Cambiá lo que quieras.
        </p>

        <div className="flex max-w-[460px] flex-col gap-[15px]">
          {fields.map(f => {
            const prefilled = !touched[f.key] && !!initial[f.key];
            return (
              <label key={f.key} className="flex flex-col gap-[7px]">
                <span className="flex items-center justify-between">
                  <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">{f.label}</span>
                  {prefilled && (
                    <span className="text-[10px] uppercase tracking-[0.12em] text-green">del formulario</span>
                  )}
                </span>
                <input
                  type={f.type ?? 'text'}
                  value={form[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  autoComplete={f.autoComplete}
                  className={`h-[50px] rounded-xl border border-navy/[0.16] px-4 text-[15px] text-navy outline-none focus:border-navy/50 ${
                    prefilled ? 'bg-[#FCFBF9]' : 'bg-white'
                  }`}
                />
              </label>
            );
          })}

          {/* Campo slug */}
          <label className="flex flex-col gap-[7px]">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">Tu link</span>
            <span className="flex h-[50px] items-center justify-between rounded-xl border border-navy px-4 text-[15px]">
              <span className="flex min-w-0 flex-1 items-center">
                <span className="flex-none text-label">lubela.app/</span>
                <input
                  value={form.slug}
                  onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 bg-transparent text-navy outline-none"
                />
              </span>
              {slugHint && (
                <span className={`flex-none text-[11px] uppercase tracking-[0.1em] ${slugHint.color}`}>
                  {slugHint.text}
                </span>
              )}
            </span>
          </label>

          {error && <p className="text-[12.5px] text-gold">{error}</p>}

          <button
            type="submit"
            disabled={!valid || pending}
            className="mt-2 grid h-[54px] place-items-center rounded-[13px] bg-navy text-[15.5px] font-medium text-white transition hover:bg-navy-deep disabled:opacity-35"
          >
            {pending ? 'Creando…' : 'Crear mi tarjeta'}
          </button>

          <p className="text-center text-[12.5px] leading-[1.6] text-label">
            Te enviamos un link para entrar. No necesitás contraseña.
          </p>
        </div>

        <div className="min-h-5 flex-1" />

        {trial && (
          <div className="flex max-w-[460px] flex-col gap-1.5 rounded-2xl bg-bone p-[17px]">
            <h2 className="text-[13.5px] font-medium">Al terminar los 30 días</h2>
            <p className="text-[12.5px] leading-[1.6] text-muted">
              Pasás a Esencial automáticamente. Nunca te cobramos sin avisarte.
            </p>
          </div>
        )}
      </form>

      {/* Preview en vivo — solo desktop */}
      <aside className="hidden w-[452px] flex-none flex-col items-center gap-5 border-l border-navy/[0.08] bg-bone p-11 lg:flex">
        <span className="text-[10.5px] uppercase tracking-[0.2em] text-label">Vista previa en vivo</span>

        <div className="w-[264px] rounded-3xl bg-navy p-2">
          <div className="overflow-hidden rounded-[18px] bg-white">
            <div className="flex flex-col items-center gap-3 bg-navy px-5 pb-6 pt-7">
              <span className="grid size-[76px] place-items-center rounded-full border border-white/30 pl-[0.08em] font-serif text-[26px] tracking-[0.08em] text-white">
                {form.name
                  .split(' ')
                  .slice(0, 2)
                  .map((w: string) => w[0])
                  .join('')
                  .toUpperCase() || '·'}
              </span>
              <div className="flex flex-col gap-1.5 text-center">
                <span className="font-serif text-[21px] text-white">{form.name || 'Tu nombre'}</span>
                <span className="text-[9.5px] uppercase tracking-[0.16em] text-white/55">
                  {form.company || 'Tu empresa'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 px-5 pb-[22px] pt-[18px]">
              <div className="h-[11px] rounded-[3px] bg-[#EFEDE8]" />
              <div className="h-[11px] w-[76%] rounded-[3px] bg-[#EFEDE8]" />
              <div className="mt-1 grid grid-cols-2 gap-[7px]">
                <div className="h-8 rounded-lg border border-navy/[0.12]" />
                <div className="h-8 rounded-lg border border-navy/[0.12]" />
              </div>
            </div>
          </div>
        </div>

        <p className="max-w-[250px] text-center text-[12.5px] leading-[1.65] text-label">
          Después vas a poder sumar tu foto, bio y redes desde el panel.
        </p>
      </aside>
    </main>
  );
}
