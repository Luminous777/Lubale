"use client";

import { useMemo, useState } from "react";

function digitsOnly(s: string) {
  return s.replace(/[^0-9]/g, "").slice(0, 15);
}

function buildWaMeUrl(digits: string): string | null {
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}

function digitsFromUrl(url: string): string {
  if (!url) return "";
  const m = url.match(/wa\.me\/(\+?\d+)/i);
  if (m && m[1]) return digitsOnly(m[1]);
  return "";
}

type Props = {
  /** URL inicial (puede venir de wa.me/...). */
  defaultUrl: string;
};

/**
 * Editor minimal del único enlace permitido en plan Free: un WhatsApp.
 * Serializa el JSON en el mismo formato que `ProfileLinksEditor` (`linksJson`)
 * para que el server-action `parseProfileLinksJson` no necesite lógica especial.
 */
export function WhatsappOnlyLinkEditor({ defaultUrl }: Props) {
  const [digits, setDigits] = useState(() => digitsFromUrl(defaultUrl));

  const linksJson = useMemo(() => {
    const url = buildWaMeUrl(digits);
    if (!url) return JSON.stringify([]);
    return JSON.stringify([{ title: "WhatsApp", url }]);
  }, [digits]);

  const valid = digits === "" || (digits.length >= 8 && digits.length <= 15);

  return (
    <div className="flex flex-col gap-3 text-sm">
      <input type="hidden" name="linksJson" value={linksJson} readOnly aria-hidden />
      <div>
        <span className="font-medium text-heading">WhatsApp</span>
        <p className="mt-1 text-xs text-muted">
          En el plan Gratis solo podés mostrar un enlace de WhatsApp. Mejorá a Pro para sumar
          más redes y enlaces.
        </p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Número con prefijo de país</span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="34612345678"
          value={digits}
          onChange={(e) => setDigits(digitsOnly(e.target.value))}
          className="app-input w-full font-mono"
        />
      </label>
      {!valid ? (
        <p className="text-xs text-red-700">
          Ingresá entre 8 y 15 dígitos (sin el +).
        </p>
      ) : null}
      {digits.length >= 8 ? (
        <p className="text-xs text-muted">
          Vista previa: <span className="font-mono">https://wa.me/{digits}</span>
        </p>
      ) : null}
    </div>
  );
}
