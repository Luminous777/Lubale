import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MembershipStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canUserEditProfile, getMembershipForUser } from "@/lib/authz";
import { getPlanFeatures } from "@/lib/plan";
import { EditProfileForm } from "@/components/dashboard/EditProfileForm";
import { ReassignOwnerForm } from "@/components/dashboard/ReassignOwnerForm";

export default async function EditCardPage(props: {
  params: Promise<{ orgSlug: string; profileId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orgSlug, profileId } = await props.params;
  const row = await getMembershipForUser(orgSlug, session.user.id);
  if (!row || row.membership.status !== MembershipStatus.active) redirect("/dashboard");

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, organizationId: row.org.id },
    include: { links: { orderBy: { sortOrder: "asc" } } },
  });
  if (!profile) notFound();

  if (
    !canUserEditProfile({
      membership: row.membership,
      profileOwnerUserId: profile.ownerUserId,
      userId: session.user.id,
    })
  ) {
    redirect(`/dashboard/${orgSlug}/cards`);
  }

  const defaultLinks = profile.links.map((l) => ({
    rowKey: l.id,
    title: l.title,
    url: l.url,
  }));

  const isAdmin = row.membership.role === "admin";
  const planFeatures = getPlanFeatures(row.org);

  const organization = {
    name: row.org.name,
    slug: row.org.slug,
    defaultLogoUrl: row.org.logoUrl,
    defaultCardBackgroundUrl: row.org.cardBackgroundUrl,
    defaultPrimary: row.org.primaryColor,
    defaultSecondary: row.org.secondaryColor,
  };

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,1400px)] flex-col gap-8 px-1 sm:px-0">
      <header className="flex items-center justify-between gap-4 border-b border-black/[0.06] pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-heading">Editar tarjeta</h1>
          <p className="mt-2 text-sm text-muted">
            Slug estable: <span className="font-mono">{profile.cardSlug}</span>
          </p>
        </div>
        <Link href={`/dashboard/${orgSlug}/cards`} className="app-link shrink-0 text-sm">
          Volver
        </Link>
      </header>

      <EditProfileForm
        orgSlug={orgSlug}
        profileId={profile.id}
        isAdmin={isAdmin}
        cardSlug={profile.cardSlug}
        organization={organization}
        displayName={profile.displayName}
        title={profile.title ?? ""}
        bio={profile.bio ?? ""}
        emailPublic={profile.emailPublic ?? ""}
        photoUrl={profile.photoUrl ?? ""}
        cardBackgroundUrl={profile.cardBackgroundUrl ?? ""}
        defaultLinks={defaultLinks}
        planFeatures={planFeatures}
      />

      {isAdmin ? (
        <div className="app-card p-8">
          <h3 className="text-sm font-semibold text-heading">Reasignar propietario</h3>
          <p className="mt-2 text-sm text-muted">
            Útil cuando cambia la persona detrás de una tarjeta impresa (mismo slug/QR).
          </p>
          <ReassignOwnerForm orgSlug={orgSlug} profileId={profile.id} />
        </div>
      ) : null}
    </div>
  );
}
