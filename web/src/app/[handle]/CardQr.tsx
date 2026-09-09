'use client';

import { useRef } from 'react';
import QRCode from 'react-qr-code';

export default function CardQr({
  url,
  slug,
  vcardHref,
  color,
}: {
  url: string;
  slug: string;
  vcardHref: string;
  color: string;
}) {
  const box = useRef<HTMLDivElement>(null);

  const downloadPng = () => {
    const svg = box.current?.querySelector('svg');
    if (!svg) return;
    const size = 1024;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const src = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(src);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `qr-${slug}.png`;
      a.click();
    };
    img.src = src;
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-bone p-[18px]">
      <div ref={box} className="flex-none rounded-[10px] bg-white p-1.5">
        <QRCode value={url} size={80} fgColor={color} bgColor="#FFFFFF" />
      </div>
      <div className="flex flex-1 flex-col gap-[9px]">
        <p className="text-sm font-medium">Escaneá o guardá su contacto</p>
        <p className="text-[12.5px] leading-[1.55] text-muted">{url.replace(/^https?:\/\//, '')}</p>
        <div className="mt-0.5 flex gap-2">
          <button
            onClick={downloadPng}
            className="rounded-[9px] border border-navy/[0.16] bg-white px-3.5 py-[9px] text-[12.5px] transition hover:bg-bone"
          >
            Descargar QR
          </button>
          <a
            href={vcardHref}
            download
            className="rounded-[9px] border border-navy/[0.16] bg-white px-3.5 py-[9px] text-[12.5px] transition hover:bg-bone"
          >
            Añadir a contactos
          </a>
        </div>
      </div>
    </div>
  );
}
