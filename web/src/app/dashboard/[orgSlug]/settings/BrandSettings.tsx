'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveBrand } from './actions';
import BrandAiModal from './BrandAiModal';
import {
  LAYOUTS, PALETTES, CUSTOM_PRIMARIES, CUSTOM_SECONDARIES, PHOTO_RADIUS, NAME_FONT,
  type Layout, type TypePair, type PhotoShape, type LockKey,
} from '../cards/[id]/edit/types';

type Brand = {
  name: string;
  slug: string;
  logoUrl: string | null;
  backgroundUrl: string | null;
  primary: string;
  secondary: string;
  layout: Layout;
  typePair: TypePair;
  photoShape: PhotoShape;
  disabledBehavior: string;
  disabledMessage: string;
  locks: Record<LockKey, 'org' | 'member'>;
};

const PERM_ROWS: { key: LockKey; label: string; hint: string }[] = [
  { key: 'plantilla',  label: 'Plantilla',        hint: 'La estructura de la tarjeta'    },
  { key: 'colores',    label: 'Colores',           hint: 'Primario, secundario y franja'  },
  { key: 'tipografia', label: 'Tipografía',        hint: 'Combinación de fuentes'         },
  { key: 'foto',       label: 'Foto de perfil',    hint: 'Su retrato o monograma'         },
  { key: 'fondo',      label: 'Imagen de fondo',   hint: 'La foto del local o la obra'   },
];

export default function BrandSettings({
  orgSlug,
  plan,
  cardCount,
  brand: initial,
}: {
  orgSlug: string;
  plan: string;
  cardCount: number;
  brand: Brand;
}) {
  const [brand, setBrand] = useState(initial);
  const [aiOpen, setAiOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof Brand>(k: K, v: Brand[K]) => setBrand(b => ({ ...b, [k]: v }));
  const setLock = (k: LockKey, v: 'org' | 'member') =>
    setBrand(b => ({ ...b, locks: { ...b.locks, [k]: v } }));

  const grad         = `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})`;
  const initials     = brand.name.slice(0, 2).toUpperCase();
  const layoutLabel  = LAYOUTS.find(l => l.key === brand.layout)?.label ?? 'Retrato';
  const lockedCount  = Object.values(brand.locks).filter(v => v === 'org').length;

  const onSave = () =>
    start(async () => {
      await saveBrand({ orgSlug, brand });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });

  return (
    <div className="relative flex min-h-full">
      <div className="flex min-w-0 flex-1 flex-col gap-[22px] px-8 pb-11 pt-8">
        <header className="flex items-start justify-between gap-[18px]">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-serif text-[34px] leading-[1.1]">Marca</h1>
            <p className="text-[13.5px] text-muted">
              Se aplica a las {cardCount} tarjetas de la organización
            </p>
          </div>
          <div className="flex flex-none gap-2.5">
            {plan === 'business' && (
              <button
                onClick={() => setAiOpen(true)}
                className="flex items-center gap-2 rounded-[11px] border border-gold px-[17px] py-3 text-[13.5px] text-gold hover:bg-gold/[0.07]"
              >
                <span>✨</span> Sugerir branding
              </button>
            )}
            <button
              onClick={onSave}
              disabled={pending}
              className="rounded-[11px] bg-navy px-5 py-3 text-[13.5px] text-white disabled:opacity-50"
            >
              {pending ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar'}
            </button>
          </div>
        </header>

        {/* identidad */}
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Nombre de la organización">
            <input
              value={brand.name}
              onChange={e => set('name', e.target.value)}
              className="h-12 w-full rounded-[11px] border border-navy/[0.16] px-[15px] text-[14.5px] outline-none focus:border-navy"
            />
          </Field>
          <Field label="Link de la organización">
            <span className="flex h-12 items-center rounded-[11px] border border-navy/[0.16] px-[15px] text-[14.5px]">
              <span className="text-label">lubela.app/</span>
              <input
                value={brand.slug}
                onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </span>
          </Field>
        </div>

        <div className="flex gap-3.5">
          <Uploader
            label="Logo"
            cta={brand.logoUrl ? 'Reemplazar' : 'Subir imagen'}
            preview={
              brand.logoUrl ? (
                <img src={brand.logoUrl} alt="" className="size-14 flex-none rounded-xl object-cover" />
              ) : (
                <span
                  className="grid size-14 flex-none place-items-center rounded-xl font-serif text-lg text-white"
                  style={{ background: grad }}
                >
                  {initials}
                </span>
              )
            }
          />
          <Uploader
            label="Fondo por defecto"
            cta={brand.backgroundUrl ? 'Reemplazar' : 'Subir imagen'}
            preview={
              <span className="h-[50px] w-[74px] flex-none rounded-[9px] bg-[repeating-linear-gradient(135deg,#E4E1DA_0_6px,#EFEDE8_6px_12px)]" />
            }
          />
        </div>

        {/* diseño base */}
        <div className="flex flex-col gap-[11px]">
          <div className="flex items-baseline justify-between">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">
              Diseño base del equipo
            </span>
            <Link href={`/dashboard/${orgSlug}/cards`} className="text-[12.5px] text-muted">
              Ver las tarjetas →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-[11px]">
            {LAYOUTS.map(l => (
              <button
                key={l.key}
                onClick={() => set('layout', l.key)}
                className={`flex flex-col overflow-hidden rounded-[14px] border-[1.5px] text-left ${
                  brand.layout === l.key ? 'border-navy bg-[#FCFBF9]' : 'border-navy/[0.12] bg-white'
                }`}
              >
                <span className="grid h-24 place-items-center bg-[#F7F6F3] p-[11px]">
                  <LayoutThumb kind={l.key} primary={brand.primary} grad={grad} initials={initials} />
                </span>
                <span className="flex flex-col gap-1 border-t border-navy/[0.07] px-3 pb-[13px] pt-[11px]">
                  <span className="text-[13px] font-medium">{l.label}</span>
                  <span className="text-[11px] leading-[1.5] text-label">{l.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs leading-[1.55] text-muted">
            Todas las tarjetas nuevas del equipo arrancan con {layoutLabel}.
          </p>
        </div>

        {/* colores + foto */}
        <div className="flex items-start gap-[22px]">
          <div className="flex flex-col gap-[11px]">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">Paleta</span>
            <div className="grid grid-cols-3 gap-[9px]">
              {PALETTES.map(p => (
                <button
                  key={p.key}
                  onClick={() => { set('primary', p.primary); set('secondary', p.secondary); }}
                  className={`flex items-center gap-[9px] rounded-[11px] border-[1.5px] bg-white px-[11px] py-[9px] ${
                    brand.primary === p.primary ? 'border-navy' : 'border-transparent'
                  }`}
                >
                  <span
                    className="size-[26px] flex-none rounded-lg"
                    style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})` }}
                  />
                  <span className="text-[12.5px]">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-px self-stretch bg-navy/10" />

          <div className="flex flex-col gap-[11px]">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">Foto</span>
            <div className="flex gap-[9px]">
              {(['circulo', 'redondo', 'cuadrado'] as PhotoShape[]).map(s => (
                <button
                  key={s}
                  onClick={() => set('photoShape', s)}
                  className={`flex w-[72px] flex-col items-center gap-2 rounded-[11px] border-[1.5px] bg-white px-2 py-3 ${
                    brand.photoShape === s ? 'border-navy' : 'border-navy/[0.14]'
                  }`}
                >
                  <span
                    className="size-7 bg-[repeating-linear-gradient(135deg,#E4E1DA_0_4px,#EFEDE8_4px_8px)]"
                    style={{ borderRadius: PHOTO_RADIUS[s] }}
                  />
                  <span className="text-[11px] capitalize text-muted">{s}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* color exacto */}
        <div className="flex flex-col gap-[11px]">
          <button
            onClick={() => setCustomOpen(v => !v)}
            className={`flex items-center gap-[13px] rounded-xl border-[1.5px] border-dashed bg-white px-[15px] py-[13px] text-left hover:bg-[#FCFBF9] ${
              customOpen ? 'border-navy' : 'border-navy/20'
            }`}
          >
            <span className="size-[30px] flex-none rounded-[9px] bg-[conic-gradient(from_210deg,#B65C5C,#B6A15C,#5CB683,#5C7AB6,#8C5CB6,#B65C5C)]" />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[13px] font-medium">Usar el color exacto de mi marca</span>
              <span className="text-[11.5px] text-label">
                {brand.primary} · {brand.secondary}
              </span>
            </span>
            <span className="flex-none text-[12.5px] text-muted">{customOpen ? '▴' : '▾'}</span>
          </button>

          {customOpen && (
            <div className="flex flex-col gap-4 rounded-xl border border-navy/[0.14] bg-[#FCFBF9] p-4">
              <SwatchRow
                label="Primario"
                value={brand.primary}
                options={CUSTOM_PRIMARIES}
                onPick={c => set('primary', c)}
              />
              <SwatchRow
                label="Secundario · degradado de la franja"
                value={brand.secondary}
                options={CUSTOM_SECONDARIES}
                onPick={c => set('secondary', c)}
              />
              {plan !== 'free' && (
                <>
                  <div className="h-px bg-navy/10" />
                  <button
                    onClick={() => setAiOpen(true)}
                    className="flex items-center gap-2.5 rounded-[9px] border border-dashed border-gold/50 bg-white px-3.5 py-3"
                  >
                    <span className="text-[13px] text-gold">✨</span>
                    <span className="flex-1 text-left text-[12.5px] text-muted">
                      Sacar los colores de mi logo automáticamente
                    </span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* tipografía */}
        <div className="flex flex-col gap-[11px]">
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">Tipografía</span>
          <div className="grid grid-cols-3 gap-[11px]">
            {(
              [
                { key: 'clasico', label: 'Clásica',   hint: 'Cormorant + Jost'         },
                { key: 'moderno', label: 'Moderna',   hint: 'Jost en todo'              },
                { key: 'mixto',   label: 'Alternada', hint: 'Serif solo en el nombre'   },
              ] as { key: TypePair; label: string; hint: string }[]
            ).map(t => (
              <button
                key={t.key}
                onClick={() => set('typePair', t.key)}
                className={`flex flex-col gap-[7px] rounded-xl border-[1.5px] p-3.5 text-left ${
                  brand.typePair === t.key ? 'border-navy bg-[#FCFBF9]' : 'border-navy/[0.14] bg-white'
                }`}
              >
                <span className="text-2xl leading-none" style={{ fontFamily: NAME_FONT[t.key] }}>
                  {brand.name.split(' ')[0]}
                </span>
                <span className="text-[13px]">{t.label}</span>
                <span className="text-[11px] text-label">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* permisos */}
        <div className="flex flex-col gap-[11px]">
          <div className="flex items-baseline justify-between">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">
              Qué puede cambiar cada persona
            </span>
            <span className="text-[11.5px] text-navy/30">
              Nombre, cargo, bio y contacto son siempre suyos
            </span>
          </div>
          <div className="overflow-hidden rounded-[14px] border border-navy/[0.12]">
            {PERM_ROWS.map(p => (
              <div
                key={p.key}
                className="flex items-center gap-4 border-b border-navy/[0.07] px-[18px] py-3.5 last:border-b-0"
              >
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[13.5px]">{p.label}</span>
                  <span className="text-[11.5px] text-label">{p.hint}</span>
                </span>
                <span className="flex flex-none rounded-full bg-bone p-[3px]">
                  {(
                    [
                      { v: 'org' as const,    label: 'Fijo para todos'  },
                      { v: 'member' as const, label: 'Cada uno elige'   },
                    ]
                  ).map(o => (
                    <button
                      key={o.v}
                      onClick={() => setLock(p.key, o.v)}
                      className={`rounded-full px-3.5 py-[7px] text-[11.5px] ${
                        brand.locks[p.key] === o.v ? 'bg-navy text-white' : 'text-label'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs leading-[1.55] text-muted">
            {lockedCount === 5
              ? 'Nadie del equipo puede desviarse del diseño.'
              : `${lockedCount} de 5 elementos fijos. Al pasar uno a "Cada uno elige", las tarjetas conservan lo que ya tenían.`}
          </p>
        </div>

        {/* tarjeta desactivada */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">
            Si una tarjeta está desactivada
          </span>
          <div className="flex gap-2.5">
            {(
              [
                { key: '404', label: 'Mostrar 404',            hint: 'La página no existe para quien la abra.'        },
                { key: 'msg', label: 'Mensaje personalizado',  hint: 'Explicá qué pasó con esa persona.'              },
              ]
            ).map(d => (
              <button
                key={d.key}
                onClick={() => set('disabledBehavior', d.key)}
                className={`flex flex-1 flex-col gap-1.5 rounded-xl border-[1.5px] p-4 text-left ${
                  brand.disabledBehavior === d.key ? 'border-navy bg-bone' : 'border-navy/[0.14] bg-white'
                }`}
              >
                <span className="text-[13.5px]">{d.label}</span>
                <span className="text-xs leading-[1.5] text-label">{d.hint}</span>
              </button>
            ))}
          </div>
          {brand.disabledBehavior === 'msg' && (
            <input
              value={brand.disabledMessage}
              onChange={e => set('disabledMessage', e.target.value.slice(0, 140))}
              placeholder="Esta persona ya no forma parte del equipo."
              className="h-12 rounded-[11px] border border-navy/[0.16] px-[15px] text-[14px] outline-none focus:border-navy"
            />
          )}
        </div>
      </div>

      {/* preview */}
      <aside className="flex w-[380px] flex-none flex-col items-center gap-4 border-l border-navy/[0.08] bg-bone p-[30px]">
        <span className="self-start text-[10.5px] uppercase tracking-[0.18em] text-label">
          Cómo se ve la marca
        </span>
        <div className="w-[280px] overflow-hidden rounded-[18px] bg-white shadow-[0_20px_44px_-22px_rgba(19,38,63,0.34)]">
          <div className="h-2" style={{ background: grad }} />
          <div className="flex items-center gap-[13px] p-[22px]" style={{ background: brand.primary }}>
            <span
              className="grid size-11 flex-none place-items-center rounded-xl border border-white/20 bg-white/[0.14] font-serif text-[15px] text-white"
              style={{ borderRadius: PHOTO_RADIUS[brand.photoShape] }}
            >
              {initials}
            </span>
            <div className="flex flex-col gap-[3px]">
              <span className="text-lg text-white" style={{ fontFamily: NAME_FONT[brand.typePair] }}>
                {brand.name}
              </span>
              <span className="text-[9.5px] uppercase tracking-[0.14em] text-white/50">
                {cardCount} tarjetas
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 p-[18px]">
            <span className="h-2.5 rounded-[3px] bg-[#EFEDE8]" />
            <span className="h-2.5 w-[72%] rounded-[3px] bg-[#EFEDE8]" />
          </div>
        </div>
        <p className="max-w-[240px] text-center text-[11.5px] leading-[1.6] text-label">
          La franja usa el degradado primario → secundario en todas las tarjetas.
        </p>
      </aside>

      {aiOpen && (
        <BrandAiModal
          orgSlug={orgSlug}
          onClose={() => setAiOpen(false)}
          onApply={({ primary, secondary }) => {
            set('primary', primary);
            set('secondary', secondary);
            setAiOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------- piezas ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-[7px]">
      <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">{label}</span>
      {children}
    </label>
  );
}

function Uploader({ label, cta, preview }: { label: string; cta: string; preview: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center gap-3.5 rounded-[14px] border border-navy/[0.12] p-4">
      {preview}
      <div className="flex flex-col gap-[7px]">
        <span className="text-[13.5px] font-medium">{label}</span>
        <button className="self-start rounded-lg border border-navy/[0.18] px-3.5 py-[7px] text-xs">
          {cta}
        </button>
      </div>
    </div>
  );
}

function SwatchRow({
  label, value, options, onPick,
}: {
  label: string; value: string; options: string[]; onPick: (c: string) => void;
}) {
  return (
    <div className="flex flex-col gap-[9px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.14em] text-label">{label}</span>
        <span className="flex items-center gap-2 rounded-lg border border-navy/[0.14] bg-white px-2.5 py-[5px]">
          <span className="size-4 rounded" style={{ background: value }} />
          <span className="font-mono text-xs">{value}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-[7px]">
        {options.map(c => (
          <button
            key={c}
            onClick={() => onPick(c)}
            className="size-[34px] rounded-[9px] border-2 shadow-[inset_0_0_0_2px_#fff]"
            style={{ background: c, borderColor: value === c ? '#13263F' : 'transparent' }}
          />
        ))}
      </div>
    </div>
  );
}

function LayoutThumb({
  kind, primary, grad, initials,
}: {
  kind: Layout; primary: string; grad: string; initials: string;
}) {
  const shell = 'h-[74px] w-[62px] overflow-hidden rounded-md shadow-[0_3px_9px_-3px_rgba(19,38,63,0.3)]';

  if (kind === 'franja')
    return (
      <span className={`${shell} flex bg-white`}>
        <span className="w-4" style={{ background: grad }} />
        <span className="flex flex-1 flex-col gap-1 p-1.5">
          <span className="size-4 rounded-full bg-[#E4E1DA]" />
          <span className="h-[3px] w-[82%] rounded bg-[#DDD9D1]" />
          <span className="h-0.5 w-3/5 rounded bg-[#E8E5DE]" />
        </span>
      </span>
    );
  if (kind === 'editorial')
    return (
      <span className={`${shell} flex flex-col gap-1.5 bg-[#F1EFE9] px-2 py-2.5`}>
        <span className="size-3.5 rounded-full bg-[#D9D5CC]" />
        <span className="h-[5px] w-full rounded" style={{ background: primary }} />
        <span className="h-[5px] w-[70%] rounded opacity-55" style={{ background: primary }} />
        <span className="flex-1" />
        <span className="h-px w-full bg-[#D9D5CC]" />
      </span>
    );
  if (kind === 'panoramica')
    return (
      <span className={`${shell} relative bg-[repeating-linear-gradient(135deg,#D7D2C7_0_5px,#E6E2D9_5px_10px)]`}>
        <span className="absolute inset-0 opacity-[0.42]" style={{ background: primary }} />
        <span className="absolute inset-x-1.5 bottom-[7px] flex flex-col gap-0.5 rounded bg-white/80 p-[5px]">
          <span className="h-[3px] w-[74%] rounded bg-[#B9B4A9]" />
          <span className="h-0.5 w-1/2 rounded bg-[#CCC7BC]" />
        </span>
      </span>
    );
  if (kind === 'monograma')
    return (
      <span className={`${shell} flex flex-col items-center justify-center gap-1.5`} style={{ background: primary }}>
        <span className="font-serif text-[22px] leading-none tracking-[0.06em] text-white/90">{initials}</span>
        <span className="h-0.5 w-[30px] rounded bg-white/35" />
      </span>
    );
  if (kind === 'minimal')
    return (
      <span className={`${shell} flex flex-col gap-1.5 border border-[#E4E1DA] bg-white px-2 py-2.5`}>
        <span className="h-1 w-[86%] rounded bg-[#C9C4B9]" />
        <span className="h-0.5 w-[56%] rounded bg-[#DDD9D1]" />
        {[0, 1, 2].map(i => <span key={i} className="h-px w-full bg-[#EAE7E0]" />)}
      </span>
    );
  // retrato
  return (
    <span className={`${shell} flex flex-col bg-white`}>
      <span className="grid h-10 place-items-center" style={{ background: grad }}>
        <span className="size-[19px] rounded-full bg-white/40" />
      </span>
      <span className="flex flex-1 flex-col items-center gap-[3px] p-1.5">
        <span className="h-[3px] w-[70%] rounded bg-[#DDD9D1]" />
        <span className="h-0.5 w-[48%] rounded bg-[#E8E5DE]" />
      </span>
    </span>
  );
}
