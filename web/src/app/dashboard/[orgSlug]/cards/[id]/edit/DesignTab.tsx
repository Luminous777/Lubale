'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LAYOUTS, PALETTES, CUSTOM_PRIMARIES, CUSTOM_SECONDARIES, PHOTO_RADIUS, BG_APPLIES,
  type Brand, type Card, type Layout, type TypePair, type PhotoShape, type BgMode,
} from './types';

export default function DesignTab({
  orgSlug,
  brand,
  card,
  resolved,
  lockedCount,
  set,
}: {
  orgSlug: string;
  brand: Brand;
  card: Card;
  resolved: { layout: Layout; primary: string; secondary: string; typePair: TypePair; photoShape: PhotoShape };
  lockedCount: number;
  set: <K extends keyof Card>(k: K, v: Card[K]) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);

  const free = (k: keyof Brand['locks']) => brand.locks[k] === 'member';
  const grad = `linear-gradient(135deg, ${resolved.primary}, ${resolved.secondary})`;
  const bgApplies = BG_APPLIES.includes(resolved.layout);

  return (
    <div className="flex flex-col gap-[22px]">
      {/* herencia */}
      <div className="flex items-center gap-3.5 rounded-[14px] border border-navy/10 bg-bone px-[18px] py-4">
        <span
          className="grid size-8 flex-none place-items-center rounded-[9px] font-serif text-[13px] text-white"
          style={{ background: grad }}
        >
          {brand.initials}
        </span>
        <div className="flex flex-1 flex-col gap-[3px]">
          <span className="text-[13.5px] font-medium">Diseño heredado de {brand.name}</span>
          <span className="text-xs leading-[1.5] text-muted">
            {lockedCount} de 5 elementos los define la marca. Los datos de esta persona se editan siempre.
          </span>
        </div>
        <Link
          href={`/dashboard/${orgSlug}/settings`}
          className="flex-none rounded-[9px] border border-navy/20 px-3.5 py-[9px] text-[12.5px] hover:bg-white"
        >
          Editar la marca
        </Link>
      </div>

      {/* plantilla */}
      <Section label="Plantilla" locked={!free('plantilla')}>
        <div className="grid grid-cols-3 gap-[11px]">
          {LAYOUTS.map(l => {
            const active = resolved.layout === l.key;
            return (
              <button
                key={l.key}
                disabled={!free('plantilla')}
                onClick={() => set('layout', l.key)}
                className={`flex flex-col overflow-hidden rounded-[14px] border-[1.5px] text-left ${
                  active ? 'border-navy bg-[#FCFBF9]' : 'border-navy/[0.12] bg-white'
                }`}
              >
                <span className="grid h-24 place-items-center bg-[#F7F6F3] p-[11px]">
                  <LayoutThumb kind={l.key} primary={resolved.primary} grad={grad} />
                </span>
                <span className="flex flex-col gap-1 border-t border-navy/[0.07] px-3 pb-[13px] pt-[11px]">
                  <span className="text-[13px] font-medium">{l.label}</span>
                  <span className="text-[11px] leading-[1.5] text-label">{l.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* paleta + foto */}
      <div className="flex items-start gap-[22px]">
        <Section label="Paleta" locked={!free('colores')}>
          <div className="grid grid-cols-3 gap-[9px]">
            {PALETTES.map(p => (
              <button
                key={p.key}
                disabled={!free('colores')}
                onClick={() => {
                  set('primary', p.primary);
                  set('secondary', p.secondary);
                }}
                className={`flex items-center gap-[9px] rounded-[11px] border-[1.5px] bg-white px-[11px] py-[9px] ${
                  resolved.primary === p.primary ? 'border-navy' : 'border-transparent'
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
        </Section>

        <div className="w-px self-stretch bg-navy/10" />

        <Section label="Foto" locked={!free('foto')} editable={free('foto')}>
          <div className="flex gap-[9px]">
            {(['circulo', 'redondo', 'cuadrado'] as PhotoShape[]).map(s => (
              <button
                key={s}
                disabled={!free('foto')}
                onClick={() => set('photoShape', s)}
                className={`flex w-[72px] flex-col items-center gap-2 rounded-[11px] border-[1.5px] bg-white px-2 py-3 ${
                  resolved.photoShape === s ? 'border-navy' : 'border-navy/[0.14]'
                }`}
              >
                <span
                  className="size-7 bg-[repeating-linear-gradient(135deg,#E4E1DA_0_4px,#EFEDE8_4px_8px)]"
                  style={{ borderRadius: PHOTO_RADIUS[s] }}
                />
                <span className="text-[11px] text-muted capitalize">{s}</span>
              </button>
            ))}
          </div>
        </Section>
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
              {resolved.primary} · {resolved.secondary}
            </span>
          </span>
          <span className="flex-none text-[12.5px] text-muted">{customOpen ? '▴' : '▾'}</span>
        </button>

        {customOpen && (
          <div className="flex flex-col gap-4 rounded-xl border border-navy/[0.14] bg-[#FCFBF9] p-4">
            {!free('colores') && (
              <div className="flex items-center gap-3 rounded-[10px] border border-gold/35 bg-white px-3.5 py-3">
                <p className="flex-1 text-[12.5px] leading-[1.5] text-muted">
                  Los colores los define la marca de {brand.name}. Para cambiarlos acá, un admin tiene que
                  pasar Colores a "Cada uno elige".
                </p>
                <Link
                  href={`/dashboard/${orgSlug}/settings`}
                  className="flex-none rounded-lg border border-navy/20 px-3 py-2 text-xs"
                >
                  Ir a Marca
                </Link>
              </div>
            )}

            <SwatchRow
              label="Primario"
              value={resolved.primary}
              options={CUSTOM_PRIMARIES}
              disabled={!free('colores')}
              onPick={c => set('primary', c)}
            />
            <SwatchRow
              label="Secundario · degradado de la franja"
              value={resolved.secondary}
              options={CUSTOM_SECONDARIES}
              disabled={!free('colores')}
              onPick={c => set('secondary', c)}
            />

            <div className="h-px bg-navy/10" />
            <button className="flex items-center gap-2.5 rounded-[9px] border border-dashed border-gold/50 bg-white px-3.5 py-3">
              <span className="text-[13px] text-gold">✨</span>
              <span className="flex-1 text-left text-[12.5px] text-muted">
                Sacar los colores de mi logo automáticamente
              </span>
              <span className="flex-none text-[10px] uppercase tracking-[0.1em] text-gold">Pro</span>
            </button>
          </div>
        )}
      </div>

      {/* fondo */}
      <Section label="Fondo del encabezado" editable={free('fondo')} locked={!free('fondo')}>
        {!bgApplies && (
          <p className="rounded-[10px] bg-bone px-3.5 py-3 text-xs leading-[1.55] text-muted">
            Esta plantilla no tiene encabezado de color, así que el fondo no se aplica. Se guarda igual
            para cuando cambies a Retrato, Monograma o Panorámica.
          </p>
        )}
        <div className="grid grid-cols-3 gap-[11px]">
          {(
            [
              { key: 'ninguno', label: 'Sin fondo',  hint: 'Color plano de la paleta'        },
              { key: 'imagen',  label: 'Foto',        hint: 'El local, la obra, el showroom'  },
              { key: 'marca',   label: 'Logo al agua', hint: 'Tu logo tramado al 9%, detrás del texto' },
            ] as { key: BgMode; label: string; hint: string }[]
          ).map(b => (
            <button
              key={b.key}
              disabled={!free('fondo')}
              onClick={() => set('bgMode', b.key)}
              className={`flex flex-col overflow-hidden rounded-xl border-[1.5px] text-left ${
                card.bgMode === b.key ? 'border-navy bg-[#FCFBF9]' : 'border-navy/[0.14] bg-white'
              }`}
            >
              <span className="relative block h-14 overflow-hidden" style={{ background: resolved.primary }}>
                {b.key === 'imagen' && (
                  <>
                    <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,#D7D2C7_0_7px,#E6E2D9_7px_14px)]" />
                    <span className="absolute inset-0 opacity-45" style={{ background: resolved.primary }} />
                  </>
                )}
                {b.key === 'marca' && (
                  <span className="absolute -bottom-2.5 -right-2 font-serif text-[44px] leading-none text-white/[0.14]">
                    {brand.initials}
                  </span>
                )}
              </span>
              <span className="flex flex-col gap-[3px] border-t border-navy/[0.07] px-3 pb-3 pt-2.5">
                <span className="text-[12.5px]">{b.label}</span>
                <span className="text-[11px] leading-[1.45] text-label">{b.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* tipografía */}
      <Section label="Tipografía" locked={!free('tipografia')}>
        <div className="grid grid-cols-3 gap-[11px]">
          {(
            [
              { key: 'clasico', label: 'Clásica',   hint: 'Cormorant + Jost',        font: 'var(--font-serif)' },
              { key: 'moderno', label: 'Moderna',   hint: 'Jost en todo',             font: 'var(--font-sans)'  },
              { key: 'mixto',   label: 'Alternada', hint: 'Serif solo en el nombre',  font: 'var(--font-serif)' },
            ] as { key: TypePair; label: string; hint: string; font: string }[]
          ).map(t => (
            <button
              key={t.key}
              disabled={!free('tipografia')}
              onClick={() => set('typePair', t.key)}
              className={`flex flex-col gap-[7px] rounded-xl border-[1.5px] p-3.5 text-left ${
                resolved.typePair === t.key ? 'border-navy bg-[#FCFBF9]' : 'border-navy/[0.14] bg-white'
              }`}
            >
              <span className="text-2xl leading-none" style={{ fontFamily: t.font }}>
                {card.displayName.split(' ')[0]}
              </span>
              <span className="text-[13px]">{t.label}</span>
              <span className="text-[11px] text-label">{t.hint}</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  label,
  locked,
  editable,
  children,
}: {
  label: string;
  locked?: boolean;
  editable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-[11px] ${locked ? 'opacity-[0.48]' : ''}`}>
      <div className="flex items-center gap-2.5">
        <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">{label}</span>
        {locked && (
          <span className="rounded-full bg-navy/[0.07] px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-muted">
            Fija por la marca
          </span>
        )}
        {editable && (
          <span className="rounded-full bg-green/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-green">
            Editable
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SwatchRow({
  label,
  value,
  options,
  disabled,
  onPick,
}: {
  label: string;
  value: string;
  options: string[];
  disabled: boolean;
  onPick: (c: string) => void;
}) {
  return (
    <div className={`flex flex-col gap-[9px] ${disabled ? 'pointer-events-none opacity-[0.48]' : ''}`}>
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

function LayoutThumb({ kind, primary, grad }: { kind: Layout; primary: string; grad: string }) {
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
        <span className="font-serif text-[22px] leading-none tracking-[0.06em] text-white/90">CR</span>
        <span className="h-0.5 w-[30px] rounded bg-white/35" />
      </span>
    );

  if (kind === 'minimal')
    return (
      <span className={`${shell} flex flex-col gap-1.5 border border-[#E4E1DA] bg-white px-2 py-2.5`}>
        <span className="h-1 w-[86%] rounded bg-[#C9C4B9]" />
        <span className="h-0.5 w-[56%] rounded bg-[#DDD9D1]" />
        {[0, 1, 2].map(i => (
          <span key={i} className="h-px w-full bg-[#EAE7E0]" />
        ))}
      </span>
    );

  // retrato (default)
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
