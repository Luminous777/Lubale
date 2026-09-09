'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { saveCard } from './actions';
import DesignTab from './DesignTab';
import LinksTab from './LinksTab';
import CardPreview from './CardPreview';
import type { Brand, Card, Layout, TypePair, PhotoShape } from './types';

type Tab = 'datos' | 'diseno' | 'links' | 'qr';

export default function CardEditor({
  orgSlug,
  isAdmin,
  plan,
  brand,
  card: initial,
}: {
  orgSlug: string;
  isAdmin: boolean;
  plan: string;
  brand: Brand;
  card: Card;
}) {
  const [tab, setTab] = useState<Tab>('datos');
  const [card, setCard] = useState(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof Card>(k: K, v: Card[K]) => setCard(c => ({ ...c, [k]: v }));

  // resolución de herencia: si el campo es null, manda la marca
  const resolved = {
    layout:     (card.layout     ?? brand.layout)     as Layout,
    primary:     card.primary    ?? brand.primary,
    secondary:   card.secondary  ?? brand.secondary,
    typePair:   (card.typePair   ?? brand.typePair)   as TypePair,
    photoShape: (card.photoShape ?? brand.photoShape) as PhotoShape,
  };

  const lockedCount = Object.values(brand.locks).filter(v => v === 'org').length;

  const onSave = () =>
    start(async () => {
      await saveCard({ orgSlug, card });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'datos',  label: 'Datos'  },
    { key: 'diseno', label: 'Diseño' },
    { key: 'links',  label: 'Links'  },
    { key: 'qr',     label: 'QR'     },
  ];

  return (
    <div className="flex min-h-full">
      <div className="flex min-w-0 flex-1 flex-col gap-5 px-8 pb-10 pt-[30px]">
        <header className="flex items-start justify-between gap-[18px]">
          <div className="flex flex-col gap-1.5">
            <Link href={`/dashboard/${orgSlug}/cards`} className="text-[12.5px] text-muted">
              ← Tarjetas
            </Link>
            <h1 className="font-serif text-[32px] leading-[1.1]">{card.displayName}</h1>
            <p className="text-[12.5px] text-label">lubela.app/{card.slug}</p>
          </div>
          <div className="flex flex-none gap-2.5">
            {plan !== 'free' && (
              <button className="flex items-center gap-2 rounded-[11px] border border-gold px-[17px] py-3 text-[13.5px] text-gold hover:bg-gold/[0.07]">
                <span>✨</span> Generar con IA
              </button>
            )}
            <button
              onClick={onSave}
              disabled={pending}
              className="rounded-[11px] bg-navy px-5 py-3 text-[13.5px] text-white disabled:opacity-50"
            >
              {pending ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar cambios'}
            </button>
          </div>
        </header>

        <nav className="flex gap-2 border-b border-navy/10">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`mr-[18px] border-b-2 px-1 pb-[11px] text-[13.5px] ${
                tab === t.key ? 'border-navy text-navy' : 'border-transparent text-label'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'datos'  && <DatosTab card={card} set={set} brand={brand} />}

        {tab === 'diseno' && (
          <DesignTab
            orgSlug={orgSlug}
            brand={brand}
            card={card}
            resolved={resolved}
            lockedCount={lockedCount}
            set={set}
          />
        )}

        {tab === 'links' && <LinksTab card={card} set={set} plan={plan} />}

        {tab === 'qr' && (
          <QrTab slug={card.slug} color={resolved.primary} plan={plan} logoUrl={brand.logoUrl} />
        )}
      </div>

      <aside className="flex w-[396px] flex-none flex-col items-center gap-4 border-l border-navy/[0.08] bg-bone p-[30px]">
        <div className="flex w-full items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-[0.18em] text-label">Vista previa</span>
          <span className="rounded-full bg-white px-[11px] py-1.5 text-[11px] text-muted">Móvil</span>
        </div>
        <CardPreview card={card} brand={brand} resolved={resolved} />
        <p className="max-w-[250px] text-center text-[11.5px] leading-[1.6] text-label">
          Vista previa — el QR estará activo en la tarjeta publicada.
        </p>
      </aside>
    </div>
  );
}

/* ---------- pestaña Datos ---------- */

function DatosTab({
  card,
  set,
  brand,
}: {
  card: Card;
  set: <K extends keyof Card>(k: K, v: Card[K]) => void;
  brand: Brand;
}) {
  const fields = [
    { key: 'displayName' as const, label: 'Nombre completo' },
    { key: 'title'       as const, label: 'Puesto'          },
    { key: 'emailPublic' as const, label: 'Email público'   },
    { key: 'phone'       as const, label: 'Teléfono'        },
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex gap-3.5">
        <Uploader
          label="Foto de perfil"
          cta={card.photoUrl ? 'Reemplazar' : 'Subir imagen'}
          locked={brand.locks.foto === 'org'}
          preview={
            <div
              className="size-16 flex-none border border-navy/10 bg-[repeating-linear-gradient(135deg,#E4E1DA_0_6px,#EFEDE8_6px_12px)]"
              style={{ borderRadius: 9999 }}
            />
          }
        />
        <Uploader
          label="Imagen de fondo"
          cta={card.backgroundUrl ? 'Reemplazar' : 'Subir imagen'}
          locked={brand.locks.fondo === 'org'}
          preview={<div className="h-11 w-16 flex-none rounded-lg bg-gradient-to-br from-navy to-navy-soft" />}
        />
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        {fields.map(f => (
          <label key={f.key} className="flex flex-col gap-[7px]">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">{f.label}</span>
            <input
              value={card[f.key]}
              onChange={e => set(f.key, e.target.value)}
              className="h-12 rounded-[11px] border border-navy/[0.16] px-[15px] text-[14.5px] outline-none focus:border-navy"
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-[7px]">
        <span className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">Bio</span>
          <span className="text-[11px] text-navy/25">{card.bio.length}/200</span>
        </span>
        <textarea
          value={card.bio}
          onChange={e => set('bio', e.target.value.slice(0, 200))}
          rows={3}
          className="resize-none rounded-[11px] border border-navy/[0.16] px-[15px] py-[13px] text-sm leading-[1.6] text-navy/70 outline-none focus:border-navy"
        />
      </label>
    </div>
  );
}

function Uploader({
  label,
  cta,
  preview,
  locked,
}: {
  label: string;
  cta: string;
  preview: React.ReactNode;
  locked: boolean;
}) {
  return (
    <div className="flex flex-1 items-center gap-3.5 rounded-[14px] border border-navy/[0.12] p-4">
      {preview}
      <div className="flex flex-col gap-[7px]">
        <span className="text-[13.5px] font-medium">{label}</span>
        {locked ? (
          <span className="text-[11.5px] text-label">Lo define la marca</span>
        ) : (
          <button className="self-start rounded-lg border border-navy/[0.18] px-3.5 py-[7px] text-xs">
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- pestaña QR ---------- */

function QrTab({
  slug,
  color,
  plan,
  logoUrl,
}: {
  slug: string;
  color: string;
  plan: string;
  logoUrl: string | null;
}) {
  const [shape, setShape] = useState<'sq' | 'soft' | 'dot'>('sq');
  const [withLogo, setWithLogo] = useState(plan !== 'free');

  return (
    <div className="flex items-start gap-[22px]">
      <div className="flex w-[212px] flex-none flex-col items-center gap-3.5 rounded-2xl border border-navy/[0.12] bg-white p-[18px]">
        <QrBox
          url={`https://lubela.app/${slug}`}
          color={color}
          shape={shape}
          logoUrl={withLogo ? logoUrl : null}
        />
        <div className="flex w-full gap-2">
          <button className="flex-1 rounded-[9px] border border-navy/[0.14] py-[9px] text-xs">PNG</button>
          <button className="flex-1 rounded-[9px] border border-navy/[0.14] py-[9px] text-xs">SVG</button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">Forma del módulo</span>
          <div className="flex gap-2.5">
            {(['sq', 'soft', 'dot'] as const).map(s => (
              <button
                key={s}
                onClick={() => setShape(s)}
                className={`grid h-[58px] w-[66px] place-items-center rounded-xl border bg-white ${
                  shape === s ? 'border-navy' : 'border-navy/[0.14]'
                }`}
              >
                <span className="flex gap-[5px]">
                  {[0, 1].map(i => (
                    <span
                      key={i}
                      className="size-3 bg-navy"
                      style={{ borderRadius: s === 'sq' ? 0 : s === 'soft' ? 2 : 9999 }}
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => plan !== 'free' && setWithLogo(v => !v)}
          className="flex items-center justify-between rounded-xl border border-navy/[0.12] px-[17px] py-[15px] text-left"
        >
          <span className="flex flex-col gap-[3px]">
            <span className="text-[13.5px]">Logo de la empresa en el centro</span>
            <span className="text-[11.5px] text-label">
              {plan === 'free' ? 'Disponible en Profesional y Empresa' : 'Se recorta un 22% del QR'}
            </span>
          </span>
          <span
            className={`flex h-[25px] w-[42px] flex-none rounded-full p-[3px] ${
              withLogo ? 'justify-end bg-navy' : 'justify-start bg-navy/[0.18]'
            }`}
          >
            <span className="size-[19px] rounded-full bg-white" />
          </span>
        </button>
      </div>
    </div>
  );
}

function QrBox({
  url,
  color,
  shape,
  logoUrl,
}: {
  url: string;
  color: string;
  shape: 'sq' | 'soft' | 'dot';
  logoUrl: string | null;
}) {
  // react-qr-code no soporta módulos redondeados: para 'soft'/'dot' usá qr-code-styling
  void shape; // reservado para futura implementación con qr-code-styling
  return (
    <div className="relative size-[170px]">
      <QRCode value={url} size={170} fgColor={color} bgColor="#FFFFFF" level="M" />
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-[10px] border-4 border-white object-cover"
        />
      )}
    </div>
  );
}
