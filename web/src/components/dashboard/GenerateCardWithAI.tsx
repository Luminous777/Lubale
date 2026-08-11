"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type GeneratedText = {
  displayName: string;
  title: string;
  bio: string;
  phone: string;
  emailPublic: string;
};

type ApiResponse = {
  text?: GeneratedText;
  photoUrl?: string;
  cardBackgroundUrl?: string;
  warnings?: string[];
  error?: string;
};

type Props = {
  /** Slug de la organización (para autorización en server). */
  orgSlug: string;
  /** ID del `<form>` cuyos campos se rellenarán al aplicar (debe coincidir con `formId` del editor). */
  formId: string;
};

type FieldName =
  | "displayName"
  | "title"
  | "bio"
  | "phone"
  | "emailPublic"
  | "photoUrl"
  | "cardBackgroundUrl";

function setFormFieldValue(formId: string, name: FieldName, value: string) {
  const form = document.getElementById(formId) as HTMLFormElement | null;
  if (!form) return;
  const el = form.elements.namedItem(name) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function GenerateCardWithAI({ orgSlug, formId }: Props) {
  const dialogId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [wantText, setWantText] = useState(true);
  const [wantPhoto, setWantPhoto] = useState(false);
  const [wantBackground, setWantBackground] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  /** Evitar portal en SSR — mismo patrón que `GenerateBrandingWithAI`. */
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  function reset() {
    setPrompt("");
    setImageFile(null);
    setWantText(true);
    setWantPhoto(false);
    setWantBackground(true);
    setError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!wantText && !wantPhoto && !wantBackground) {
      setError("Elegí al menos qué generar (texto, foto o fondo).");
      return;
    }
    if (!prompt.trim() && !imageFile) {
      setError("Escribí un prompt o subí una imagen de referencia.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("orgSlug", orgSlug);
      fd.append("prompt", prompt);
      fd.append("wantText", String(wantText));
      fd.append("wantPhoto", String(wantPhoto));
      fd.append("wantBackground", String(wantBackground));
      if (imageFile) fd.append("image", imageFile);

      const res = await fetch("/api/v1/ai/generate-card", { method: "POST", body: fd });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando con IA");
    } finally {
      setLoading(false);
    }
  }

  function applyAll() {
    if (!result) return;
    if (result.text) {
      if (result.text.displayName) setFormFieldValue(formId, "displayName", result.text.displayName);
      if (result.text.title) setFormFieldValue(formId, "title", result.text.title);
      if (result.text.bio) setFormFieldValue(formId, "bio", result.text.bio);
      if (result.text.phone) setFormFieldValue(formId, "phone", result.text.phone);
      if (result.text.emailPublic)
        setFormFieldValue(formId, "emailPublic", result.text.emailPublic);
    }
    if (result.photoUrl) setFormFieldValue(formId, "photoUrl", result.photoUrl);
    if (result.cardBackgroundUrl)
      setFormFieldValue(formId, "cardBackgroundUrl", result.cardBackgroundUrl);
    setOpen(false);
    reset();
  }

  const dialog = open ? (
    <div
      id={dialogId}
      role="dialog"
      aria-modal="true"
      aria-label="Generar tarjeta con IA"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="my-8 w-full max-w-2xl rounded-[20px] border border-black/[0.08] bg-surface p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-heading">Generar tarjeta con IA</h2>
            <p className="mt-1 text-sm text-muted">
              Describí a la persona o subí una foto de una tarjeta física. Solo administradores.
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
              <span className="font-medium text-heading">Prompt / descripción</span>
              <textarea
                rows={4}
                className="app-input w-full"
                placeholder="Ej: Lucas Martín, Gerente Comercial en Hormigón DIVSA. Soy ingeniero civil con 10 años de experiencia en obra pública."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-heading">
                Imagen de referencia (opcional, máx. 2 MB)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="app-input w-full"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              <span className="text-xs text-muted">
                Si subís foto de una tarjeta física, la IA extrae nombre/cargo/teléfono/email
                automáticamente.
              </span>
            </label>

            <fieldset className="flex flex-col gap-2 rounded-xl border border-black/[0.06] bg-page/30 p-4 text-sm">
              <legend className="px-2 font-medium text-heading">Qué generar</legend>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={wantText} onChange={(e) => setWantText(e.target.checked)} />
                Texto (nombre, puesto, bio, teléfono, email)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={wantPhoto} onChange={(e) => setWantPhoto(e.target.checked)} />
                Foto / avatar (gpt-image-1, ~$0.04)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={wantBackground}
                  onChange={(e) => setWantBackground(e.target.checked)}
                />
                Fondo de la tarjeta (gpt-image-1, ~$0.06)
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
              <button type="submit" className="app-btn-primary h-10 px-5 text-sm" disabled={loading}>
                {loading ? "Generando…" : "Generar"}
              </button>
              <span className="text-xs text-muted">
                Puede tardar 10–60s. Las imágenes se guardan en{" "}
                <span className="font-mono">/uploads/{orgSlug}/…</span>.
              </span>
            </div>
          </form>
        ) : (
          <ResultPreview
            result={result}
            onApply={applyAll}
            onTryAgain={() => {
              setResult(null);
            }}
          />
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
        Generar con IA
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </div>
  );
}

function ResultPreview({
  result,
  onApply,
  onTryAgain,
}: {
  result: ApiResponse;
  onApply: () => void;
  onTryAgain: () => void;
}) {
  return (
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

      {result.text ? (
        <section className="rounded-xl border border-black/[0.06] bg-page/30 p-4 text-sm">
          <h3 className="mb-2 font-medium text-heading">Texto generado</h3>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <FieldRow label="Nombre" value={result.text.displayName} />
            <FieldRow label="Puesto" value={result.text.title} />
            <FieldRow label="Teléfono" value={result.text.phone} />
            <FieldRow label="Email" value={result.text.emailPublic} />
            <div className="sm:col-span-2">
              <FieldRow label="Bio" value={result.text.bio} multiline />
            </div>
          </dl>
        </section>
      ) : null}

      {result.photoUrl ? (
        <section className="rounded-xl border border-black/[0.06] bg-page/30 p-4">
          <h3 className="mb-2 text-sm font-medium text-heading">Foto generada</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.photoUrl}
            alt="Foto generada"
            className="h-40 w-40 rounded-xl border border-black/[0.06] object-cover"
          />
        </section>
      ) : null}

      {result.cardBackgroundUrl ? (
        <section className="rounded-xl border border-black/[0.06] bg-page/30 p-4">
          <h3 className="mb-2 text-sm font-medium text-heading">Fondo generado</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.cardBackgroundUrl}
            alt="Fondo generado"
            className="h-32 w-full rounded-xl border border-black/[0.06] object-cover"
          />
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-black/[0.06] pt-4">
        <button type="button" onClick={onApply} className="app-btn-primary h-10 px-5 text-sm">
          Aplicar al formulario
        </button>
        <button type="button" onClick={onTryAgain} className="app-btn-secondary h-10 px-5 text-sm">
          Probar de nuevo
        </button>
        <span className="text-xs text-muted">
          Después acordate de hacer click en <em>Guardar</em> en el formulario principal.
        </span>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span
        className={
          multiline
            ? "whitespace-pre-line text-heading"
            : "truncate font-medium text-heading"
        }
      >
        {value || <span className="text-muted">—</span>}
      </span>
    </div>
  );
}
