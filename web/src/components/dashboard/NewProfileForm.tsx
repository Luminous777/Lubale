"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";
import {
  DEFAULT_PROFILE_LINKS,
  ProfileLinksEditor,
} from "@/components/dashboard/ProfileLinksEditor";
import { WhatsappOnlyLinkEditor } from "@/components/dashboard/WhatsappOnlyLinkEditor";
import { EditorSidePreviewLayout } from "@/components/dashboard/EditorSidePreviewLayout";
import {
  LiveCardPreviewPanel,
  type LiveCardPreviewOrg,
} from "@/components/dashboard/LiveCardPreviewPanel";
import { GenerateCardWithAI } from "@/components/dashboard/GenerateCardWithAI";
import type { CreateProfileFormState } from "@/server/profile";
import { createProfileFormAction } from "@/server/profile";
import type { PlanFeatures } from "@/lib/plan";

const FORM_ID = "new-profile-form";

type Props = {
  orgSlug: string;
  organization: LiveCardPreviewOrg;
  planFeatures: PlanFeatures;
};

export function NewProfileForm({ orgSlug, organization, planFeatures }: Props) {
  const [state, formAction, pending] = useActionState<CreateProfileFormState, FormData>(
    createProfileFormAction.bind(null, orgSlug),
    undefined,
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
        {planFeatures.aiEnabled ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-b border-black/[0.06] pb-3">
            <GenerateCardWithAI orgSlug={orgSlug} formId={FORM_ID} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span>La generación con IA está disponible en planes Pro y Empresa.</span>
            <Link href="/precios" className="font-semibold underline-offset-2 hover:underline">
              Mejorar plan →
            </Link>
          </div>
        )}
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Slug de tarjeta (URL)</span>
          <input
            name="cardSlug"
            className="app-input w-full font-mono text-sm"
            placeholder="ventas-001"
            required
          />
          <span className="text-xs text-muted">
            Debe ser único en la empresa. Si ves un error al guardar, prueba otro slug (p. ej.{" "}
            <span className="font-mono">ventas-002</span>).
          </span>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Nombre visible</span>
          <input name="displayName" className="app-input w-full" required />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Puesto</span>
          <input name="title" className="app-input w-full" />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Bio</span>
          <textarea name="bio" rows={4} className="app-input w-full" />
        </label>
        <ImageUrlWithUpload
          name="photoUrl"
          label="Foto (enlace o imagen)"
          orgSlug={orgSlug}
          uploadKind="profile-photo"
          placeholder="https://… o sube una imagen"
          hint="Puedes pegar una URL o elegir una foto de tu equipo (máx. 2 MB)."
        />
        {planFeatures.cardBackgroundEnabled ? (
          <ImageUrlWithUpload
            name="cardBackgroundUrl"
            label="Fondo de la tarjeta (opcional)"
            orgSlug={orgSlug}
            uploadKind="profile-card-bg"
            placeholder="https://… o sube una imagen de fondo"
            hint="Franja superior de la tarjeta pública. Solo administradores pueden subirla al crear la tarjeta (máx. 2 MB)."
          />
        ) : (
          <input type="hidden" name="cardBackgroundUrl" value="" readOnly aria-hidden />
        )}
        <div className="rounded-[12px] border border-black/[0.06] bg-page/20 p-6">
          {planFeatures.onlyWhatsappLinks ? (
            <WhatsappOnlyLinkEditor defaultUrl="" />
          ) : (
            <ProfileLinksEditor defaultLinks={DEFAULT_PROFILE_LINKS} />
          )}
        </div>
        <button className="app-btn-primary mt-2 w-full sm:w-auto" type="submit" disabled={pending}>
          {pending ? "Creando…" : "Crear"}
        </button>
        </form>
      }
      preview={<LiveCardPreviewPanel formId={FORM_ID} org={organization} mode="profile-card" />}
    />
  );
}
