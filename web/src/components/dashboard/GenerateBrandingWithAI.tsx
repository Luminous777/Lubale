"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type BrandingResult = {
  primaryColor: string;
  secondaryColor: string;
  rationale: string;
};

type ApiResponse = {
  palette?: BrandingResult;
  logoUrl?: string;
  cardBackgroundUrl?: string;
  warnings?: string[];
  error?: string;
};

type Props = {
  orgSlug: string;
  /** ID del `<form>` cuyos campos se rellenarán al aplicar. */
  formId: string;
  /** Nombre de la org (para sugerir un prompt por defecto). */
  organizationName: string;
};

type FieldName = "logoUrl" | "primaryColor" | "secondaryColor" | "cardBackgroundUrl";

function setFormFieldValue(formId: string, name: FieldName, value: string) {
  const form = document.getElementById(formId) as HTMLFormElement | null;
  if (!form) return;
  const els = form.elements.namedItem(name);
  const list = els instanceof RadioNodeList ? Array.from(els) : els ? [els] : [];
  for (const node of list) {
    if (
      node instanceof HTMLInputElement ||
      node instanceof HTMLTextAreaElement ||
      node instanceof HTMLSelectElement
    ) {
      node.value = value;
      node.dispatchEvent(new Event("input", { bubbles: true }));
      node.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

export function GenerateBrandingWithAI({ orgSlug, formId, organizationName }: Props) {
  const dialogId = useId();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [wantLogo, setWantLogo] = useState(true);
  const [wantPalette, setWantPalette] = useState(true);
  const [wantBackground, setWantBackground] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  function reset() {
    setPrompt("");
    setWantLogo(true);
    setWantPalette(true);
    setWantBackground(false);
    setError(null);
    setResult(null);
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!prompt.trim()) {
      setError("Describí brevemente la empresa.");
      return;
    }
    if (!wantLogo && !wantPalette && !wantBackground) {
      setError("Elegí al menos logo, paleta o fondo.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ai/generate-branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, prompt, wantLogo, wantPalette, wantBackground }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando branding");
    } finally {
      setLoading(false);
    }
  }

  function applyAll() {
    if (!result) return;
    if (result.logoUrl) setFormFieldValue(formId, "logoUrl", result.logoUrl);
    if (result.palette) {
      setFormFieldValue(formId, "primaryColor", result.palette.primaryColor);
      setFormFieldValue(formId, "secondaryColor", result.palette.secondaryColor);
    }
    if (result.cardBackgroundUrl) {
      setFormFieldValue(formId, "cardBackgroundUrl", result.cardBackgroundUrl);
    }
    setOpen(false);
    reset();
  }

  const dialog = open ? (
    <div
      id={dialogId}
      role="dialog"
      aria-modal="true"
      aria-label="Generar branding con IA"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="my-8 w-full max-w-2xl rounded-[20px] border border-black/[0.08] bg-surface p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-heading">Generar branding con IA</h2>
            <p className="mt-1 text-sm text-muted">
              La IA propone logo y paleta para <strong>{organizationName}</strong>. Solo
              administradores.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="app-link text-sm"
            aria-label="Cerrar"
          >
            Cerrar
          </button>
        </div>

        {!result ? (
          <form onSubmit={onGenerate} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-heading">Describí la empresa</span>
              <textarea
                rows={5}
                className="app-input w-full"
                placeholder={`Ej: ${organizationName} es una empresa de hormigón premezclado en Argentina, dirigida a constructoras grandes. Estilo profesional, sobrio, confiable.`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>

            <fieldset className="flex flex-col gap-2 rounded-xl border border-black/[0.06] bg-page/30 p-4 text-sm">
              <legend className="px-2 font-medium text-heading">Qué generar</legend>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={wantLogo}
                  onChange={(e) => setWantLogo(e.target.checked)}
                />
                Logo (gpt-image-1, ~$0.04)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={wantPalette}
                  onChange={(e) => setWantPalette(e.target.checked)}
                />
                Paleta de colores (primario y secundario)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={wantBackground}
                  onChange={(e) => setWantBackground(e.target.checked)}
                />
                Fondo de la tarjeta (cubre toda la tarjeta · gpt-image-1, ~$0.04)
              </label>
            </fieldset>

            {error ? (
              <p
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                className="app-btn-primary h-10 px-5 text-sm"
                disabled={loading}
              >
                {loading ? "Generando…" : "Generar"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {result.warnings && result.warnings.length > 0 ? (
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                role="status"
              >
                <ul className="list-disc pl-5">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.palette ? (
              <section className="rounded-xl border border-black/[0.06] bg-page/30 p-4 text-sm">
                <h3 className="mb-3 font-medium text-heading">Paleta</h3>
                <div className="flex flex-wrap gap-4">
                  <Swatch label="Primario" hex={result.palette.primaryColor} />
                  <Swatch label="Secundario" hex={result.palette.secondaryColor} />
                </div>
                {result.palette.rationale ? (
                  <p className="mt-3 text-xs text-muted">{result.palette.rationale}</p>
                ) : null}
              </section>
            ) : null}

            {result.logoUrl ? (
              <section className="rounded-xl border border-black/[0.06] bg-page/30 p-4">
                <h3 className="mb-2 text-sm font-medium text-heading">Logo generado</h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.logoUrl}
                  alt="Logo generado"
                  className="h-32 w-32 rounded-xl border border-black/[0.06] bg-white object-contain p-2"
                />
              </section>
            ) : null}

            {result.cardBackgroundUrl ? (
              <section className="rounded-xl border border-black/[0.06] bg-page/30 p-4">
                <h3 className="mb-2 text-sm font-medium text-heading">Fondo de la tarjeta</h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.cardBackgroundUrl}
                  alt="Fondo de la tarjeta generado"
                  className="h-56 w-40 rounded-xl border border-black/[0.06] object-cover"
                />
                <p className="mt-2 text-xs text-muted">
                  Cubre toda la tarjeta pública (cada tarjeta puede sustituirlo con su propio fondo).
                </p>
              </section>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 border-t border-black/[0.06] pt-4">
              <button
                type="button"
                onClick={applyAll}
                className="app-btn-primary h-10 px-5 text-sm"
              >
                Aplicar al formulario
              </button>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="app-btn-secondary h-10 px-5 text-sm"
              >
                Probar de nuevo
              </button>
              <span className="text-xs text-muted">
                Después hacé click en <em>Guardar</em> en el panel principal.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="app-btn-secondary inline-flex h-9 items-center gap-2 px-4 text-sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
      >
        <span aria-hidden>✨</span>
        Generar branding con IA
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </div>
  );
}

function Swatch({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-12 w-12 rounded-lg border border-black/[0.08] shadow-sm"
        style={{ backgroundColor: hex }}
        aria-hidden
      />
      <div className="flex flex-col text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-heading">{hex}</span>
      </div>
    </div>
  );
}
