"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";
import {
  ProfileLinksEditor,
  type ProfileLinkDraft,
} from "@/components/dashboard/ProfileLinksEditor";
import { WhatsappOnlyLinkEditor } from "@/components/dashboard/WhatsappOnlyLinkEditor";
import { EditorSidePreviewLayout } from "@/components/dashboard/EditorSidePreviewLayout";
import {
  LiveCardPreviewPanel,
  type LiveCardPreviewOrg,
} from "@/components/dashboard/LiveCardPreviewPanel";
import { GenerateCardWithAI } from "@/components/dashboard/GenerateCardWithAI";
import type { UpdateProfileFormState } from "@/server/profile";
import { updateProfileFormAction } from "@/server/profile";
import type { PlanFeatures } from "@/lib/plan";

type Props = {
  orgSlug: string;
  profileId: string;
  isAdmin?: boolean;
  cardSlug: string;
  organization: LiveCardPreviewOrg;
  displayName: string;
  title: string;
  bio: string;
  emailPublic: string;
  photoUrl: string;
  cardBackgroundUrl: string;
  defaultLinks: ProfileLinkDraft[];
  planFeatures: PlanFeatures;
};

export function EditProfileForm({
  orgSlug,
  profileId,
  isAdmin = false,
  cardSlug,
  organization,
  displayName,
  title,
  bio,
  emailPublic,
  photoUrl,
  cardBackgroundUrl,
  defaultLinks,
  planFeatures,
}: Props) {
  const [state, formAction, pending] = useActionState<UpdateProfileFormState, FormData>(
    updateProfileFormAction.bind(null, orgSlug, profileId),
    undefined,
  );

  const formId = `edit-profile-${profileId}`;
  const initialWhatsappUrl =
    defaultLinks.find((l) => l.url.toLowerCase().includes("wa.me"))?.url ?? "";

  return (
    <EditorSidePreviewLayout
      editor={
        <form id={formId} action={formAction} className="app-card flex min-w-0 flex-col gap-4 p-8">
        {state?.error ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}
        {isAdmin && planFeatures.aiEnabled ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-b border-black/[0.06] pb-3">
            <GenerateCardWithAI orgSlug={orgSlug} formId={formId} />
          </div>
        ) : null}
        {isAdmin && !planFeatures.aiEnabled ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span>
              La generación con IA está disponible en planes Pro y Empresa.
            </span>
            <Link href="/precios" className="font-semibold underline-offset-2 hover:underline">
              Mejorar plan →
            </Link>
          </div>
        ) : null}
        <input type="hidden" name="cardSlug" value={cardSlug} readOnly aria-hidden />
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Nombre visible</span>
          <input
            name="displayName"
            defaultValue={displayName}
            className="app-input w-full"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Puesto</span>
          <input name="title" defaultValue={title} className="app-input w-full" />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Bio</span>
          <textarea name="bio" rows={4} defaultValue={bio} className="app-input w-full" />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Email público</span>
          <input
            name="emailPublic"
            type="email"
            defaultValue={emailPublic}
            className="app-input w-full"
          />
        </label>
        <ImageUrlWithUpload
          name="photoUrl"
          label="Foto (enlace o imagen)"
          defaultValue={photoUrl}
          orgSlug={orgSlug}
          uploadKind="profile-photo"
          profileId={profileId}
          hint="Puedes pegar una URL o subir una imagen (máx. 2 MB)."
        />
        {planFeatures.cardBackgroundEnabled ? (
          <ImageUrlWithUpload
            name="cardBackgroundUrl"
            label="Fondo de la tarjeta (opcional)"
            defaultValue={cardBackgroundUrl}
            orgSlug={orgSlug}
            uploadKind="profile-card-bg"
            profileId={profileId}
            hint="Se muestra en la franja superior de la tarjeta pública. URL o imagen subida (máx. 2 MB)."
          />
        ) : (
          <input type="hidden" name="cardBackgroundUrl" value="" readOnly aria-hidden />
        )}
        <div className="rounded-[12px] border border-black/[0.06] bg-page/20 p-6">
          {planFeatures.onlyWhatsappLinks ? (
            <WhatsappOnlyLinkEditor defaultUrl={initialWhatsappUrl} />
          ) : (
            <ProfileLinksEditor key={profileId} defaultLinks={defaultLinks} />
          )}
        </div>
        <button className="app-btn-primary mt-2 w-full sm:w-auto" type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
        </form>
      }
      preview={<LiveCardPreviewPanel formId={formId} org={organization} mode="profile-card" />}
    />
  );
}
