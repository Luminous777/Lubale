import Link from "next/link";
import { redirect } from "next/navigation";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getMembershipForUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getPlanFeatures } from "@/lib/plan";
import { NewProfileForm } from "@/components/dashboard/NewProfileForm";

export default async function NewCardPage(props: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orgSlug } = await props.params;
  const row = await getMembershipForUser(orgSlug, session.user.id);
  if (!row || row.membership.status !== MembershipStatus.active) redirect("/dashboard");
  if (row.membership.role !== MembershipRole.admin) redirect(`/dashboard/${orgSlug}/cards`);

  const planFeatures = getPlanFeatures(row.org);
  const currentCount = await prisma.profile.count({ where: { organizationId: row.org.id } });
  if (currentCount >= planFeatures.maxProfiles) {
    redirect(`/dashboard/${orgSlug}/billing?reason=seats`);
  }

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
          <h1 className="text-2xl font-semibold tracking-tight text-heading">Nueva tarjeta</h1>
          <p className="mt-2 text-sm text-muted">
            Define un <span className="font-medium text-heading">slug estable</span> para impresión
            (por ejemplo <span className="font-mono">ventas-001</span>).
          </p>
        </div>
        <Link href={`/dashboard/${orgSlug}/cards`} className="app-link shrink-0 text-sm">
          Volver
        </Link>
      </header>

      <NewProfileForm orgSlug={orgSlug} organization={organization} planFeatures={planFeatures} />
    </div>
  );
}
