"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { PublicProfileView } from "@/components/public/PublicProfileView";
import { DEFAULT_ACCENT, DEFAULT_SECONDARY, sanitizeCssColor } from "@/lib/cssColor";
import { parseProfileLinksJson } from "@/lib/profileLinksJson";
import { IphoneDeviceFrame } from "@/components/dashboard/IphoneDeviceFrame";

export type LiveCardPreviewOrg = {
  name: string;
  slug: string;
  defaultLogoUrl: string | null;
  defaultCardBackgroundUrl?: string | null;
  defaultPrimary: string;
  defaultSecondary: string | null;
};

type PreviewMode = "profile-card" | "branding-only";

type Props = {
  formId: string;
  org: LiveCardPreviewOrg;
  mode: PreviewMode;
};

const BRANDING_DEMO_LINKS_JSON = JSON.stringify([
  { title: "Web", url: "https://example.com" },
  { title: "LinkedIn", url: "https://www.linkedin.com/company/example" },
]);

function readField(form: HTMLFormElement, name: string): string {
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value;
  if (el instanceof HTMLSelectElement) return el.value;
  if (el instanceof RadioNodeList) return el.value;
  return "";
}

export function LiveCardPreviewPanel({ formId, org, mode }: Props) {
  const [tick, setTick] = useState(0);
  /** Mismo HTML en servidor y primer paint cliente (evita error de hidratación). */
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    const bump = () => setTick((n) => n + 1);
    form.addEventListener("input", bump);
    form.addEventListener("change", bump);
    const id = window.setInterval(bump, 450);
    return () => {
      form.removeEventListener("input", bump);
      form.removeEventListener("change", bump);
      window.clearInterval(id);
    };
  }, [formId]);

  const viewProps = useMemo(() => {
    void tick;
    if (typeof document === "undefined") return null;
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return null;

    const origin = window.location.origin;
    const primary = sanitizeCssColor(org.defaultPrimary, DEFAULT_ACCENT);
    const secondary = sanitizeCssColor(org.defaultSecondary ?? "", DEFAULT_SECONDARY);

    if (mode === "branding-only") {
      const logo = readField(form, "logoUrl").trim() || org.defaultLogoUrl?.trim() || null;
      const orgBgRaw = readField(form, "cardBackgroundUrl").trim();
      const orgBg =
        orgBgRaw ||
        (typeof org.defaultCardBackgroundUrl === "string" ? org.defaultCardBackgroundUrl.trim() : "") ||
        null;
      const p = sanitizeCssColor(readField(form, "primaryColor").trim() || org.defaultPrimary, DEFAULT_ACCENT);
      const sRaw = readField(form, "secondaryColor").trim();
      const s = sRaw ? sanitizeCssColor(sRaw, DEFAULT_SECONDARY) : DEFAULT_SECONDARY;
      const slug = "ejemplo";
      const cardUrl = `${origin}/card/${org.slug}/${slug}`;
      const links = parseProfileLinksJson(BRANDING_DEMO_LINKS_JSON).map((l, i) => ({
        id: `demo-${i}`,
        title: l.title,
        url: l.url,
      }));
      return {
        displayName: "Nombre de ejemplo",
        photoUrl: null as string | null,
        cardBackgroundUrl: null as string | null,
        organizationCardBackgroundUrl: orgBg || null,
        title: "Puesto o área",
        bio: "Así se verá la tarjeta con el logo y los colores actuales de la marca.",
        phone: null as string | null,
        emailPublic: "contacto@empresa.com",
        organizationName: org.name,
        organizationLogoUrl: logo,
        links,
        primary: p,
        secondary: s,
        cardUrl,
        vcardHref: "#",
        variant: "embed" as const,
      };
    }

    const cardSlug = readField(form, "cardSlug").trim() || "preview";
    const linksJson = readField(form, "linksJson") || "[]";
    const links = parseProfileLinksJson(linksJson).map((l, i) => ({
      id: `pv-${i}`,
      title: l.title,
      url: l.url,
    }));

    const logo = org.defaultLogoUrl?.trim() || null;

    return {
      displayName: readField(form, "displayName").trim() || "Nombre visible",
      photoUrl: readField(form, "photoUrl").trim() || null,
      cardBackgroundUrl: readField(form, "cardBackgroundUrl").trim() || null,
      organizationCardBackgroundUrl: org.defaultCardBackgroundUrl?.trim() || null,
      title: readField(form, "title").trim() || null,
      bio: readField(form, "bio").trim() || null,
      phone: readField(form, "phone").trim() || null,
      emailPublic: readField(form, "emailPublic").trim() || null,
      organizationName: org.name,
      organizationLogoUrl: logo,
      links,
      primary,
      secondary,
      cardUrl: `${origin}/card/${org.slug}/${encodeURIComponent(cardSlug)}`,
      vcardHref: "#",
      variant: "embed" as const,
    };
  }, [formId, org, mode, tick]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted lg:text-left">
        Vista previa · mockup dispositivo
      </p>
      {!mounted || !viewProps ? (
        <div
          className="flex min-h-[280px] items-center justify-center rounded-[1.85rem] border border-dashed border-black/[0.12] bg-page/40 text-sm text-muted"
          aria-hidden
        >
          Cargando…
        </div>
      ) : (
        <IphoneDeviceFrame>
          <div className="flex min-h-full w-full min-w-0 flex-1 flex-col">
            <PublicProfileView {...viewProps} />
          </div>
        </IphoneDeviceFrame>
      )}
    </div>
  );
}
