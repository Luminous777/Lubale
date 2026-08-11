import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileStatus, DeactivatedProfileBehavior } from "@prisma/client";
import { DEFAULT_ACCENT, DEFAULT_SECONDARY, sanitizeCssColor } from "@/lib/cssColor";
import {
  applyPlanGatesToPublicProfile,
  getPublicProfileForHandle,
} from "@/lib/publicProfile";
import { absoluteUrl } from "@/lib/urls";
import { PublicProfileView } from "@/components/public/PublicProfileView";
import { RESERVED_HANDLES } from "@/lib/handles";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { handle } = await props.params;
  if (RESERVED_HANDLES.has(handle)) return { title: "No encontrado" };
  const profile = await getPublicProfileForHandle(handle);
  if (!profile) return { title: "Tarjeta no encontrada" };
  if (profile.status === ProfileStatus.disabled) {
    return { title: `${profile.displayName} (inactivo)` };
  }
  const title = profile.displayName;
  const description = profile.bio ?? profile.title ?? "Tarjeta digital";
  const url = absoluteUrl(`/${handle}`);
  const photoAbsolute = profile.photoUrl ? absoluteUrl(profile.photoUrl) : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "profile",
      images: photoAbsolute ? [{ url: photoAbsolute }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: photoAbsolute ? [photoAbsolute] : undefined,
    },
  };
}

export default async function PublicHandlePage(props: Props) {
  const { handle } = await props.params;
  if (RESERVED_HANDLES.has(handle)) notFound();
  const raw = await getPublicProfileForHandle(handle);
  if (!raw) notFound();

  const profile = applyPlanGatesToPublicProfile(raw);

  if (profile.status === ProfileStatus.disabled) {
    if (profile.organization.deactivatedBehavior === DeactivatedProfileBehavior.gone) {
      notFound();
    }
    return (
      <div className="min-h-screen bg-page px-6 py-16">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-semibold text-heading">Contacto no disponible</h1>
          <p className="mt-3 text-muted">
            Esta tarjeta ya no está activa.
          </p>
        </div>
      </div>
    );
  }

  const cardUrl = absoluteUrl(`/${handle}`);
  // Para particulares la vCard usa el mismo cardSlug "me" interno.
  const vcardHref = `/api/vcard/${handle}/${profile.cardSlug}`;

  const primary = sanitizeCssColor(profile.organization.primaryColor ?? "", DEFAULT_ACCENT);
  const secondary = sanitizeCssColor(profile.organization.secondaryColor ?? "", DEFAULT_SECONDARY);

  return (
    <PublicProfileView
      displayName={profile.displayName}
      photoUrl={profile.photoUrl}
      cardBackgroundUrl={profile.cardBackgroundUrl}
      organizationCardBackgroundUrl={profile.organization.cardBackgroundUrl}
      title={profile.title}
      bio={profile.bio}
      phone={profile.phone}
      emailPublic={profile.emailPublic}
      organizationName={
        // En un perfil personal con plan Free, la marca es "el propio nombre".
        profile.organization.kind === "personal" && !profile.organization.logoUrl
          ? profile.displayName
          : profile.organization.name
      }
      organizationLogoUrl={profile.organization.logoUrl}
      links={profile.links.map((l) => ({ id: l.id, url: l.url, title: l.title }))}
      primary={primary}
      secondary={secondary}
      cardUrl={cardUrl}
      vcardHref={vcardHref}
    />
  );
}
