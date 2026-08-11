"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import {
  ChannelGlyph,
  channelAriaLabel,
  detectChannelKind,
  filterSocialPresets,
  presetById,
  SOCIAL_QUICK_BAR_IDS,
  type SocialLinkPreset,
} from "@/lib/contactChannels";
import { sanitizeHttpUrl } from "@/lib/links";
import { whatsappMeUrlFromInput } from "@/lib/whatsappLink";

/** `rowKey`: id estable (p. ej. ProfileLink.id) para hidratación SSR/ cliente sin desajustes. */
export type ProfileLinkDraft = { title: string; url: string; rowKey?: string };

/** Enlaces iniciales sugeridos al crear una tarjeta nueva. */
export const DEFAULT_PROFILE_LINKS: ProfileLinkDraft[] = [
  { rowKey: "preset-web", title: "Web", url: "https://example.com" },
];

type Row = { id: string; title: string; url: string };

/** Fila nueva tras interacción del usuario (solo cliente; nanoid evita colisiones). */
function newClientRow(partial?: Partial<Pick<Row, "title" | "url">>): Row {
  return {
    id: nanoid(),
    title: partial?.title ?? "",
    url: partial?.url ?? "",
  };
}

const EMPTY_ROW_ID = "draft-empty";

/** Filas iniciales con ids deterministas (misma salida en servidor y en el primer render del cliente). */
function rowsFromDefaults(defaultLinks: ProfileLinkDraft[]): Row[] {
  if (defaultLinks.length === 0) {
    return [{ id: "draft-0", title: "", url: "" }];
  }
  return defaultLinks.map((l, i) => ({
    id: l.rowKey ?? `draft-${i}`,
    title: l.title,
    url: l.url,
  }));
}

function serializeRows(rows: Row[]): string {
  const items: ProfileLinkDraft[] = [];
  for (const r of rows) {
    const url = sanitizeHttpUrl(r.url);
    if (!url) continue;
    const title = r.title.trim() || channelAriaLabel(detectChannelKind(url), null);
    items.push({ title, url });
  }
  return JSON.stringify(items);
}

function focusUrlField(rowId: string) {
  setTimeout(() => {
    document.getElementById(`link-url-${rowId}`)?.focus();
  }, 0);
}

function QuickSocialChip({ preset, onPick }: { preset: SocialLinkPreset; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      aria-label={`Añadir ${preset.label}`}
      title={preset.label}
    >
      <ChannelGlyph kind={preset.glyphKind} className="h-5 w-5" />
      <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-slate-900 px-0.5 text-[11px] font-bold leading-none text-white">
        +
      </span>
    </button>
  );
}

type Props = {
  defaultLinks: ProfileLinkDraft[];
};

export function ProfileLinksEditor({ defaultLinks }: Props) {
  const [rows, setRows] = useState<Row[]>(() => rowsFromDefaults(defaultLinks));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappInput, setWhatsappInput] = useState("");
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);

  const linksJson = useMemo(() => serializeRows(rows), [rows]);
  const filteredPresets = useMemo(() => filterSocialPresets(pickerQuery), [pickerQuery]);

  const anyOverlayOpen = pickerOpen || whatsappOpen;

  useEffect(() => {
    if (!anyOverlayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (whatsappOpen) {
        setWhatsappOpen(false);
        setWhatsappError(null);
      } else {
        setPickerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anyOverlayOpen, whatsappOpen]);

  useEffect(() => {
    if (!anyOverlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [anyOverlayOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [pickerOpen]);

  useEffect(() => {
    if (!whatsappOpen) return;
    const id = requestAnimationFrame(() => whatsappRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [whatsappOpen]);

  const openSocialPicker = () => {
    setPickerQuery("");
    setPickerOpen(true);
  };

  const updateRow = (id: string, patch: Partial<Pick<Row, "title" | "url">>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const row = newClientRow();
    setRows((prev) => [...prev, row]);
    focusUrlField(row.id);
  };

  const appendRowWithUrl = (url: string) => {
    const row = newClientRow({ url });
    setRows((prev) => [...prev, row]);
    focusUrlField(row.id);
  };

  const handlePresetPick = (preset: SocialLinkPreset) => {
    if (preset.requiresWhatsAppNumber) {
      setPickerOpen(false);
      setWhatsappInput("");
      setWhatsappError(null);
      setWhatsappOpen(true);
      return;
    }
    setPickerOpen(false);
    appendRowWithUrl(preset.insertUrl);
  };

  const confirmWhatsAppNumber = () => {
    const url = whatsappMeUrlFromInput(whatsappInput);
    if (!url) {
      setWhatsappError(
        "Escribe el número con prefijo de país (solo dígitos, p. ej. 34612345678). Entre 8 y 15 dígitos.",
      );
      return;
    }
    setWhatsappOpen(false);
    setWhatsappError(null);
    appendRowWithUrl(url);
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (next.length === 0) {
        return [{ id: EMPTY_ROW_ID, title: "", url: "" }];
      }
      return next;
    });
  };

  const quickPresets = SOCIAL_QUICK_BAR_IDS.map((id) => presetById(id)).filter(
    (p): p is SocialLinkPreset => Boolean(p),
  );

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <span className="font-medium text-heading">Enlaces</span>
        <p className="mt-1 text-xs text-muted">
          Toca un icono para añadir esa red, o usa <span className="font-medium">Añadir</span> para ver
          todas. WhatsApp pide solo el número (con prefijo país). El resto usa URL en la fila.
        </p>
      </div>

      <input type="hidden" name="linksJson" value={linksJson} readOnly aria-hidden />

      {/* Barra rápida estilo Linktree */}
      <div className="flex flex-wrap items-center gap-2">
        {quickPresets.map((p) => (
          <QuickSocialChip key={p.id} preset={p} onPick={() => handlePresetPick(p)} />
        ))}
        <button
          type="button"
          onClick={openSocialPicker}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-lg font-light text-slate-600 transition hover:border-slate-400 hover:bg-slate-100"
          aria-label="Más redes sociales"
          title="Más redes"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={openSocialPicker}
        className="app-btn-primary w-full rounded-full py-3.5 text-sm font-semibold shadow-sm"
      >
        + Añadir
      </button>

      <div className="flex flex-col gap-4">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-3 rounded-[12px] border border-black/[0.06] bg-page/30 p-4"
          >
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">URL</span>
              <input
                id={`link-url-${r.id}`}
                type="text"
                inputMode="url"
                autoComplete="url"
                value={r.url}
                onChange={(e) => updateRow(r.id, { url: e.target.value })}
                className="app-input w-full font-mono text-xs"
                placeholder="https://… o mailto:… o tel:…"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Título (opcional)</span>
                <input
                  type="text"
                  value={r.title}
                  onChange={(e) => updateRow(r.id, { title: e.target.value })}
                  className="app-input w-full"
                  placeholder="Texto del enlace"
                  maxLength={80}
                />
              </label>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-black/[0.08] bg-surface px-3 py-2 text-xs font-medium text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-800 sm:mb-0.5"
                onClick={() => removeRow(r.id)}
                aria-label="Eliminar enlace"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="app-btn-secondary w-full text-xs sm:text-sm" onClick={addRow}>
        Añadir fila vacía
      </button>

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
          onClick={() => setPickerOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="social-picker-title"
            className="flex max-h-[min(85vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-heading"
                onClick={() => setPickerOpen(false)}
                aria-label="Volver"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <h2 id="social-picker-title" className="text-base font-semibold text-heading">
                Añadir icono social
              </h2>
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-heading"
                onClick={() => setPickerOpen(false)}
                aria-label="Cerrar"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="border-b border-black/[0.06] px-4 py-3">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  ref={searchRef}
                  type="search"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Buscar"
                  className="app-input w-full rounded-xl py-2.5 pl-10"
                  autoComplete="off"
                />
              </div>
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto">
              {filteredPresets.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-muted">Sin resultados</li>
              ) : (
                filteredPresets.map((p) => (
                  <li key={p.id} className="border-b border-black/[0.04] last:border-0">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
                      onClick={() => handlePresetPick(p)}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700">
                        <ChannelGlyph kind={p.glyphKind} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 font-medium text-heading">{p.label}</span>
                      <span className="shrink-0 text-slate-400" aria-hidden>
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {whatsappOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
          onClick={() => {
            setWhatsappOpen(false);
            setWhatsappError(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="whatsapp-dialog-title"
            className="w-full max-w-md rounded-2xl border border-black/[0.08] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="whatsapp-dialog-title" className="text-lg font-semibold text-heading">
              Número de WhatsApp
            </h2>
            <p className="mt-2 text-sm text-muted">
              Solo dígitos, con código de país sin el + (por ejemplo España:{" "}
              <span className="font-mono">34612345678</span>).
            </p>
            <label className="mt-4 flex flex-col gap-2 text-sm">
              <span className="font-medium text-heading">Teléfono</span>
              <input
                ref={whatsappRef}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={whatsappInput}
                onChange={(e) => {
                  setWhatsappInput(e.target.value);
                  setWhatsappError(null);
                }}
                className="app-input w-full font-mono"
                placeholder="34612345678"
              />
            </label>
            {whatsappError ? (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {whatsappError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => {
                  setWhatsappOpen(false);
                  setWhatsappError(null);
                }}
              >
                Cancelar
              </button>
              <button type="button" className="app-btn-primary" onClick={confirmWhatsAppNumber}>
                Añadir WhatsApp
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
