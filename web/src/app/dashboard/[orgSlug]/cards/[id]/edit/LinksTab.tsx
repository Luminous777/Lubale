'use client';

import type { Card } from './types';

const MARKS: Record<string, string> = {
  whatsapp: '◈', email: '✉', phone: '✆', web: '⌘', social: '◉', other: '⌖',
};

export default function LinksTab({
  card,
  set,
  plan,
}: {
  card: Card;
  set: <K extends keyof Card>(k: K, v: Card[K]) => void;
  plan: string;
}) {
  const toggle = (id: string) =>
    set('links', card.links.map(l => (l.id === id ? { ...l, enabled: !l.enabled } : l)));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-[9px]">
        {card.links.map(l => (
          <div
            key={l.id}
            className="flex items-center gap-[13px] rounded-xl border border-navy/[0.12] bg-white px-4 py-3.5"
          >
            <span className="cursor-grab text-sm text-navy/25">⠿</span>
            <span className="grid size-[34px] flex-none place-items-center rounded-[9px] bg-bone font-serif text-[13px]">
              {MARKS[l.kind] ?? '⌖'}
            </span>
            <span className="w-[120px] flex-none text-[13.5px]">{l.title}</span>
            <input
              value={l.url}
              onChange={e =>
                set('links', card.links.map(x => (x.id === l.id ? { ...x, url: e.target.value } : x)))
              }
              className="min-w-0 flex-1 bg-transparent text-[13px] text-muted outline-none"
            />
            <button
              onClick={() => toggle(l.id)}
              className={`flex h-[23px] w-10 flex-none rounded-full p-[3px] ${
                l.enabled ? 'justify-end bg-navy' : 'justify-start bg-navy/[0.18]'
              }`}
            >
              <span className="size-[17px] rounded-full bg-white" />
            </button>
          </div>
        ))}
      </div>

      <button className="grid h-12 place-items-center rounded-xl border border-dashed border-navy/[0.28] text-[13.5px]">
        + Agregar link
      </button>

      {plan === 'free' && (
        <div className="flex items-center gap-3 rounded-xl bg-bone px-[17px] py-[15px]">
          <span className="flex-none rounded-full bg-gold px-2.5 py-1 text-[9.5px] uppercase tracking-[0.12em] text-white">
            Pro
          </span>
          <p className="text-[12.5px] leading-[1.55] text-muted">
            En plan Esencial solo se muestra un link de WhatsApp. Los links ilimitados están en Profesional
            y Empresa.
          </p>
        </div>
      )}
    </div>
  );
}
