"use client";

import { useActionState, useMemo, useState } from "react";
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";
import { DEFAULT_ACCENT, DEFAULT_SECONDARY, sanitizeCssColor } from "@/lib/cssColor";
import { EditorSidePreviewLayout } from "@/components/dashboard/EditorSidePreviewLayout";
import { LiveCardPreviewPanel } from "@/components/dashboard/LiveCardPreviewPanel";
import { GenerateBrandingWithAI } from "@/components/dashboard/GenerateBrandingWithAI";
import type { BrandingFormState } from "@/server/org";
import { updateBrandingFormAction } from "@/server/org";
import type { PlanFeatures } from "@/lib/plan";

const FORM_ID = "org-branding-form";

const PALETTE_TEMPLATES = [
  { name: "Océano",   primary: "#1e40af", secondary: "#3b82f6" },
  { name: "Bosque",   primary: "#166534", secondary: "#22c55e" },
  { name: "Coral",    primary: "#be123c", secondary: "#fb7185" },
  { name: "Ámbar",    primary: "#92400e", secondary: "#f59e0b" },
  { name: "Violeta",  primary: "#5b21b6", secondary: "#a78bfa" },
  { name: "Pizarra",  primary: "#1e293b", secondary: "#64748b" },
] as const;

type Props = {
  orgSlug: string;
  organizationName: string;
  defaultLogoUrl: string;
  defaultCardBackgroundUrl: string;
  defaultPrimaryColor: string;
  defaultSecondaryColor: string;
  defaultDeactivatedBehavior: string;
  planFeatures: PlanFeatures;
};

/** Valor válido para `<input type="color">` (#rrggbb). Si no es hex, muestra un fallback. */
function hexForColorInput(css: string, fallback: string): string {
  const t = css.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return t.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    const r = t[1]!,
      g = t[2]!,
      b = t[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

export function BrandingSettingsForm({
  orgSlug,
  organizationName,
  defaultLogoUrl,
  defaultCardBackgroundUrl,
  defaultPrimaryColor,
  defaultSecondaryColor,
  defaultDeactivatedBehavior,
  planFeatures,
}: Props) {
  const lockedByPlan = !planFeatures.customBrandingEnabled;
  const [primary, setPrimary] = useState(defaultPrimaryColor);
  const [secondary, setSecondary] = useState(defaultSecondaryColor);

  const [state, formAction, pending] = useActionState<BrandingFormState, FormData>(
    updateBrandingFormAction.bind(null, orgSlug),
    undefined,
  );

  const primaryTrim = primary.trim() || DEFAULT_ACCENT;
  const secondaryTrim = secondary.trim();
  const primaryForPreview = sanitizeCssColor(primaryTrim, DEFAULT_ACCENT);
  const secondaryForGradient = secondaryTrim
    ? sanitizeCssColor(secondaryTrim, DEFAULT_SECONDARY)
    : DEFAULT_SECONDARY;
  const primarySafe = primaryForPreview;

  const previewOrg = useMemo(
    () => ({
      name: organizationName,
      slug: orgSlug,
      defaultLogoUrl: defaultLogoUrl.trim() || null,
      defaultCardBackgroundUrl: defaultCardBackgroundUrl.trim() || null,
      defaultPrimary: defaultPrimaryColor,
      defaultSecondary: defaultSecondaryColor.trim() || null,
    }),
    [
      organizationName,
      orgSlug,
      defaultLogoUrl,
      defaultCardBackgroundUrl,
      defaultPrimaryColor,
      defaultSecondaryColor,
    ],
  );

  return (
    <EditorSidePreviewLayout
      editor={
        <form id={FORM_ID} action={formAction} className="app-card flex min-w-0 flex-col gap-4 p-8">
        {state?.error ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}
        {planFeatures.aiEnabled && planFeatures.customBrandingEnabled ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-b border-black/[0.06] pb-3">
            <GenerateBrandingWithAI
              orgSlug={orgSlug}
              formId={FORM_ID}
              organizationName={organizationName}
            />
          </div>
        ) : null}
        <ImageUrlWithUpload
          name="logoUrl"
          label="Logo (enlace o imagen)"
          defaultValue={defaultLogoUrl}
          orgSlug={orgSlug}
          uploadKind="org-logo"
          placeholder="https://… o sube una imagen"
          hint="Puedes pegar una URL o elegir un archivo (JPG, PNG, WebP o GIF, máx. 2 MB)."
        />

        <ImageUrlWithUpload
          name="cardBackgroundUrl"
          label="Fondo de la tarjeta (toda la tarjeta)"
          defaultValue={defaultCardBackgroundUrl}
          orgSlug={orgSlug}
          uploadKind="org-card-bg"
          placeholder="https://… o sube una imagen"
          hint="Imagen que cubre toda la tarjeta pública. Cada persona puede poner otro fondo en su tarjeta y sustituye a este. Vacía = solo degradado con los colores de abajo."
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-heading">Plantillas rápidas</span>
          <div className="flex flex-wrap gap-2">
            {PALETTE_TEMPLATES.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => { setPrimary(t.primary); setSecondary(t.secondary); }}
                className="flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-heading shadow-sm transition hover:bg-black/[0.04]"
                title={`${t.primary} / ${t.secondary}`}
              >
                <span
                  className="h-3.5 w-7 shrink-0 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${t.primary}, ${t.secondary})` }}
                  aria-hidden
                />
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:items-stretch sm:gap-5">
          <div className="flex h-full min-h-0 flex-col gap-3 rounded-xl border border-black/[0.06] bg-page/60 p-4 text-sm sm:p-5">
            <span className="shrink-0 font-medium text-heading">Color primario</span>
            <div className="flex min-h-[5.25rem] flex-1 flex-col text-[11px] leading-relaxed text-muted sm:min-h-[5.5rem]">
              <p>
                Selector o texto: <span className="font-mono">#hex</span>,{" "}
                <span className="font-mono">rgb(63, 103, 196)</span>, etc.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 border-t border-black/[0.06] pt-4">
              <input
                type="color"
                value={hexForColorInput(primary, DEFAULT_ACCENT)}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-black/[0.12] bg-surface p-1 shadow-sm"
                aria-label="Elegir color primario"
              />
              <input
                name="primaryColor"
                type="text"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="app-input min-w-0 flex-1 font-mono text-sm"
                required
              />
            </div>
          </div>
          <div className="flex h-full min-h-0 flex-col gap-3 rounded-xl border border-black/[0.06] bg-page/60 p-4 text-sm sm:p-5">
            <span className="shrink-0 font-medium text-heading">Color secundario</span>
            <div className="flex min-h-[5.25rem] flex-1 flex-col text-[11px] leading-relaxed text-muted sm:min-h-[5.5rem]">
              <p>
                Degradado y acentos. Opcional: si lo vacías, usamos un tono por defecto en la vista
                previa.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 border-t border-black/[0.06] pt-4">
              <input
                type="color"
                value={hexForColorInput(secondary || DEFAULT_SECONDARY, DEFAULT_SECONDARY)}
                onChange={(e) => setSecondary(e.target.value)}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-black/[0.12] bg-surface p-1 shadow-sm"
                aria-label="Elegir color secundario"
              />
              <input
                name="secondaryColor"
                type="text"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                className="app-input min-w-0 flex-1 font-mono text-sm"
                placeholder={`Opcional — ej. ${DEFAULT_SECONDARY}`}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-black/[0.06] bg-page/40 p-4 text-xs text-muted">
          <p>
            <span className="font-medium text-heading">Degradado</span>: si no hay imagen de fondo,
            la parte superior de la tarjeta usa{" "}
            <span className="font-mono text-[11px]">{primarySafe}</span> →{" "}
            <span className="font-mono text-[11px]">{secondaryForGradient}</span>.
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Perfil desactivado</span>
          <select
            name="deactivatedBehavior"
            defaultValue={defaultDeactivatedBehavior}
            className="app-input w-full"
          >
            <option value="gone">404 (ocultar)</option>
            <option value="message">Mostrar mensaje neutral</option>
          </select>
        </label>
        <button
          className="app-btn-primary mt-2 w-full sm:w-auto"
          type="submit"
          disabled={pending || lockedByPlan}
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        </form>
      }
      preview={<LiveCardPreviewPanel formId={FORM_ID} org={previewOrg} mode="branding-only" />}
    />
  );
}
