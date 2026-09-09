'use client';

import { PHOTO_RADIUS, NAME_FONT, BG_APPLIES, type Brand, type Card, type Layout, type TypePair, type PhotoShape } from './types';

export default function CardPreview({
  card,
  brand,
  resolved,
}: {
  card: Card;
  brand: Brand;
  resolved: { layout: Layout; primary: string; secondary: string; typePair: TypePair; photoShape: PhotoShape };
}) {
  const { layout, primary, secondary, typePair, photoShape } = resolved;
  const grad = `linear-gradient(135deg, ${primary}, ${secondary})`;
  const radius = PHOTO_RADIUS[photoShape];
  const nameStyle = {
    fontFamily: NAME_FONT[typePair],
    fontWeight: typePair === 'moderno' ? 500 : 400,
    letterSpacing: typePair === 'moderno' ? '-0.01em' : '0.01em',
  };
  const initials = card.displayName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const bgOn = BG_APPLIES.includes(layout) && card.bgMode !== 'ninguno';

  const Layers = () =>
    !bgOn ? null : (
      <>
        {card.bgMode === 'imagen' && (
          <>
            <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,#D7D2C7_0_9px,#E6E2D9_9px_18px)]" />
            <span className="absolute inset-0 opacity-60" style={{ background: primary }} />
          </>
        )}
        {card.bgMode === 'marca' && (
          <span className="absolute -bottom-4 -right-2.5 font-serif text-[96px] leading-none text-white/[0.09]">
            {brand.initials}
          </span>
        )}
      </>
    );

  return (
    <div className="w-[276px] rounded-[34px] bg-navy-deep p-2 shadow-[0_24px_50px_-22px_rgba(14,27,46,0.5)]">
      <div className="overflow-hidden rounded-[27px] bg-white">
        {layout === 'retrato' && (
          <>
            <div className="h-1.5" style={{ background: grad }} />
            <div
              className="relative flex flex-col items-center gap-3 overflow-hidden px-5 pb-[22px] pt-6"
              style={{ background: primary }}
            >
              <Layers />
              <span
                className="relative z-[2] grid size-[78px] place-items-center border border-white/30 pl-[0.08em] font-serif text-[26px] tracking-[0.08em] text-white"
                style={{ borderRadius: radius }}
              >
                {initials}
              </span>
              <div className="relative z-[2] flex flex-col gap-[5px] text-center">
                <span className="text-[21px] text-white" style={nameStyle}>{card.displayName}</span>
                <span className="text-[9px] uppercase tracking-[0.16em] text-white/[0.58]">{card.title}</span>
              </div>
            </div>
          </>
        )}

        {layout === 'franja' && (
          <>
            <div className="h-1.5" style={{ background: grad }} />
            <div className="flex">
              <span className="w-5 flex-none" style={{ background: grad }} />
              <div className="flex flex-1 flex-col gap-3 px-[18px] py-[22px]">
                <span
                  className="size-14 border border-navy/10 bg-[repeating-linear-gradient(135deg,#E4E1DA_0_5px,#EFEDE8_5px_10px)]"
                  style={{ borderRadius: radius }}
                />
                <div className="flex flex-col gap-[5px]">
                  <span className="text-xl leading-[1.15]" style={{ ...nameStyle, color: primary }}>
                    {card.displayName}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.16em] text-label">{card.title}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {layout === 'editorial' && (
          <>
            <div className="h-1.5" style={{ background: grad }} />
            <div className="flex flex-col gap-3.5 bg-bone px-5 pb-5 pt-6">
              <span
                className="size-[46px] bg-[repeating-linear-gradient(135deg,#E1DDD4_0_5px,#EBE8E1_5px_10px)]"
                style={{ borderRadius: radius }}
              />
              <div className="flex flex-col gap-[7px]">
                <span className="text-[30px] leading-[1.05]" style={{ ...nameStyle, color: primary }}>
                  {card.displayName.split(' ').map((w, i) => (
                    <span key={i} className="block">{w}</span>
                  ))}
                </span>
                <span className="h-0.5 w-[34px] opacity-40" style={{ background: primary }} />
                <span className="text-[9px] uppercase tracking-[0.16em] text-label">{card.title}</span>
              </div>
            </div>
          </>
        )}

        {layout === 'panoramica' && (
          <div className="relative h-[186px] bg-[repeating-linear-gradient(135deg,#D7D2C7_0_9px,#E6E2D9_9px_18px)]">
            <span className="absolute inset-0 opacity-[0.44]" style={{ background: primary }} />
            <div className="absolute inset-x-3.5 bottom-3.5 flex items-center gap-3 rounded-xl bg-white/90 p-3.5">
              <span
                className="size-11 flex-none bg-[repeating-linear-gradient(135deg,#E4E1DA_0_5px,#EFEDE8_5px_10px)]"
                style={{ borderRadius: radius }}
              />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-lg leading-[1.1]" style={{ ...nameStyle, color: primary }}>
                  {card.displayName}
                </span>
                <span className="text-[8.5px] uppercase tracking-[0.14em] text-label">{card.title}</span>
              </div>
            </div>
          </div>
        )}

        {layout === 'monograma' && (
          <>
            <div className="h-1.5" style={{ background: grad }} />
            <div
              className="relative flex flex-col items-center gap-4 overflow-hidden px-5 pb-[26px] pt-[34px]"
              style={{ background: primary }}
            >
              <Layers />
              <span className="relative z-[2] font-serif text-[62px] leading-none tracking-[0.06em] text-white">
                {initials}
              </span>
              <span className="relative z-[2] h-px w-11 bg-white/[0.34]" />
              <div className="relative z-[2] flex flex-col gap-[5px] text-center">
                <span className="text-base text-white" style={nameStyle}>{card.displayName}</span>
                <span className="text-[8.5px] uppercase tracking-[0.16em] text-white/55">{card.title}</span>
              </div>
            </div>
          </>
        )}

        {layout === 'minimal' && (
          <>
            <div className="h-1.5" style={{ background: grad }} />
            <div className="flex flex-col gap-[11px] border-b border-navy/10 px-5 pb-5 pt-[26px]">
              <span className="text-[26px] leading-[1.1]" style={{ ...nameStyle, color: primary }}>
                {card.displayName}
              </span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-label">
                {card.title} · {brand.name}
              </span>
            </div>
          </>
        )}

        <div className="flex flex-col gap-[13px] px-[18px] pb-5 pt-4">
          {card.bio && (
            <p className="text-center text-[11.5px] leading-[1.65] text-navy/70">{card.bio}</p>
          )}
          <div className="grid grid-cols-2 gap-[7px]">
            {['Llamar', 'WhatsApp', 'Email', 'Guardar'].map(a => (
              <span
                key={a}
                className="grid h-8 place-items-center rounded-lg border border-navy/[0.13] text-[10.5px]"
              >
                {a}
              </span>
            ))}
          </div>
          <span
            className="grid h-9 place-items-center rounded-[9px] text-[11.5px] text-white"
            style={{ background: primary }}
          >
            Dejar mis datos
          </span>
        </div>
      </div>
    </div>
  );
}
