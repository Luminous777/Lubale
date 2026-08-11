import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ProfileStatus, DeactivatedProfileBehavior } from "@prisma/client";
import { DEFAULT_ACCENT, DEFAULT_SECONDARY, sanitizeCssColor } from "@/lib/cssColor";
import { applyPlanGatesToPublicProfile, getPublicProfile } from "@/lib/publicProfile";
import { absoluteUrl, publicCardPath } from "@/lib/urls";
import { PublicProfileView } from "@/components/public/PublicProfileView";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ orgSlug: string; cardSlug: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { orgSlug, cardSlug } = await props.params;
  const profile = await getPublicProfile(orgSlug, cardSlug);
  if (!profile) return { title: "Tarjeta no encontrada" };
  if (profile.status === ProfileStatus.disabled) {
    return { title: `${profile.displayName} (inactivo)` };
  }
  const title = `${profile.displayName} · ${profile.organization.name}`;
  const description = profile.bio ?? profile.title ?? "Tarjeta digital";
  const url = absoluteUrl(publicCardPath(orgSlug, cardSlug));
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

export default async function PublicCardPage(props: Props) {
  const { orgSlug, cardSlug } = await props.params;
  const raw = await getPublicProfile(orgSlug, cardSlug);
  if (!raw) notFound();
  const profile = applyPlanGatesToPublicProfile(raw);

  if (profile.status === ProfileStatus.active) {
    const profileId = raw.id;
    after(async () => {
      await prisma.cardView.create({ data: { profileId } });
    });
  }

  if (profile.status === ProfileStatus.disabled) {
    if (profile.organization.deactivatedBehavior === DeactivatedProfileBehavior.gone) {
      notFound();
    }
    return (
      <div className="min-h-screen bg-page px-6 py-16">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-semibold text-heading">Contacto no disponible</h1>
          <p className="mt-3 text-muted">
            Esta tarjeta ya no está activa. Si necesitas ayuda, contacta a la empresa
            directamente.
          </p>
        </div>
      </div>
    );
  }

  const cardUrl = absoluteUrl(publicCardPath(orgSlug, cardSlug));
  const vcardHref = `/api/vcard/${orgSlug}/${cardSlug}`;

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
      organizationName={profile.organization.name}
      organizationLogoUrl={profile.organization.logoUrl}
      links={profile.links.map((l) => ({ id: l.id, url: l.url, href: `/api/t/${l.id}`, title: l.title }))}
      primary={primary}
      secondary={secondary}
      cardUrl={cardUrl}
      vcardHref={vcardHref}
    />
  );
}
