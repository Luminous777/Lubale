"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type ProfileQrProps = {
  url: string;
  /** Tamaño visual del QR (por defecto compacto para tarjeta pública sin scroll). */
  size?: "default" | "compact";
  /** Muestra un enlace de descarga debajo del QR. */
  showDownload?: boolean;
};

export function ProfileQr({ url, size = "compact", showDownload = false }: ProfileQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const alt = useMemo(() => `QR para ${url}`, [url]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const src = await QRCode.toDataURL(url, {
        margin: 1,
        width: 512,
        color: { dark: "#3f67c4", light: "#ffffff" },
      });
      if (!cancelled) setDataUrl(src);
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const box =
    size === "compact"
      ? "h-44 w-44 p-2 text-xs"
      : "h-56 w-56 p-3 text-sm";

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-[12px] border border-black/[0.06] bg-surface text-muted shadow-[var(--shadow-card)] ${box}`}
      >
        Generando QR…
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={alt}
        className={`rounded-[12px] border border-black/[0.06] bg-surface object-contain shadow-[var(--shadow-card)] ${box}`}
      />
      {showDownload ? (
        <a
          href={dataUrl}
          download="qr-tarjeta.png"
          className="text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline"
        >
          Descargar QR (.png)
        </a>
      ) : null}
    </div>
  );
}
