'use client';

import { useState, useTransition } from 'react';
import { generateBranding } from './actions';

export default function BrandAiModal({
  orgSlug,
  onClose,
  onApply,
}: {
  orgSlug: string;
  onClose: () => void;
  onApply: (v: { primary: string; secondary: string }) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<{ primary: string; secondary: string } | null>(null);
  const [quota, setQuota] = useState<{ used: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      setError(null);
      const res = await generateBranding({ orgSlug, prompt });
      if (!res.ok) return setError(res.error ?? 'No se pudo generar.');
      setResult({ primary: res.primary!, secondary: res.secondary! });
      setQuota(res.quota ?? null);
    });

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-navy-deep/55 p-10">
      <div className="w-[600px] overflow-hidden rounded-[20px] bg-white shadow-[0_40px_90px_-30px_rgba(14,27,46,0.6)]">
        <header className="flex items-center justify-between border-b border-navy/10 px-[26px] py-[22px]">
          <span className="flex items-center gap-[11px]">
            <span className="text-base text-gold">✨</span>
            <h2 className="font-serif text-2xl">Sugerir branding con IA</h2>
          </span>
          <button onClick={onClose} className="text-lg text-label">✕</button>
        </header>

        <div className="flex flex-col gap-[18px] px-[26px] py-6">
          <label className="flex flex-col gap-[7px]">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">
              Describí tu marca
            </span>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
              placeholder="Estudio de arquitectura, sobrio y contemporáneo. Materiales naturales, mucha luz."
              className="resize-none rounded-[11px] border border-navy/[0.16] px-[15px] py-[13px] text-sm leading-[1.6] outline-none focus:border-navy"
            />
          </label>

          <button className="flex items-center gap-2.5 rounded-[11px] border border-dashed border-navy/[0.24] px-[15px] py-[13px] text-left">
            <span className="text-[13.5px] text-muted">Subir el logo para extraer la paleta</span>
          </button>

          {result && (
            <div className="flex flex-col gap-3.5 rounded-[14px] bg-bone p-[18px]">
              <span className="text-[10.5px] uppercase tracking-[0.16em] text-label">Propuesta</span>
              <div className="flex items-center gap-3">
                <span
                  className="size-14 flex-none rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${result.primary}, ${result.secondary})` }}
                />
                <div className="flex flex-1 flex-col gap-1.5">
                  <span className="flex gap-[7px]">
                    <span className="size-[30px] rounded-lg" style={{ background: result.primary }} />
                    <span className="size-[30px] rounded-lg" style={{ background: result.secondary }} />
                    <span className="size-[30px] rounded-lg border border-navy/[0.12] bg-bone" />
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {result.primary} · {result.secondary}
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-[12.5px] text-gold">{error}</p>}

          <div className="flex items-center justify-between">
            <span className="text-xs text-label">
              {quota
                ? `Cupo de branding: ${quota.used} de ${quota.total} este mes`
                : 'Cupo de branding: 4 por mes'}
            </span>
            <div className="flex gap-2.5">
              <button
                onClick={onClose}
                className="rounded-[11px] border border-navy/[0.16] px-[18px] py-3 text-[13.5px]"
              >
                Cancelar
              </button>
              {result ? (
                <button
                  onClick={() => onApply(result)}
                  className="rounded-[11px] bg-navy px-5 py-3 text-[13.5px] text-white"
                >
                  Aplicar al formulario
                </button>
              ) : (
                <button
                  onClick={run}
                  disabled={pending || prompt.trim().length < 10}
                  className="rounded-[11px] bg-navy px-5 py-3 text-[13.5px] text-white disabled:opacity-40"
                >
                  {pending ? 'Generando…' : 'Generar propuesta'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
