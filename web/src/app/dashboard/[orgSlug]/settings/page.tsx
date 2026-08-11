import Link from "next/link";
import { redirect } from "next/navigation";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembershipForUser } from "@/lib/authz";
import { getPlanFeatures } from "@/lib/plan";
import { BrandingSettingsForm } from "@/components/dashboard/BrandingSettingsForm";

export default async function OrgSettingsPage(props: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orgSlug } = await props.params;
  const row = await getMembershipForUser(orgSlug, session.user.id);
  if (!row || row.membership.status !== MembershipStatus.active) redirect("/dashboard");
  if (row.membership.role !== MembershipRole.admin) {
    redirect(`/dashboard/${orgSlug}`);
  }

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) redirect("/dashboard");

  const planFeatures = getPlanFeatures(org);

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,1400px)] flex-col gap-8 px-1 sm:px-0">
      <header className="border-b border-black/[0.06] pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-heading">Marca</h1>
        <p className="mt-2 text-sm text-muted">
          Logo, fondo de tarjeta, colores y perfil desactivado se aplican a las tarjetas públicas.
          La vista previa se actualiza al editar el formulario.
        </p>
      </header>

      {!planFeatures.customBrandingEnabled ? (
        <div className="app-card flex flex-col gap-2 border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-semibold">La personalización de marca está bloqueada en plan Gratis.</p>
          <p className="text-xs">
            Mejorá a Pro o Empresa para subir logo, elegir colores, fondo de tarjeta y generar
            branding con IA.
          </p>
          <Link
            href={`/dashboard/${orgSlug}/billing`}
            className="mt-1 inline-flex w-fit rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Ver planes
          </Link>
        </div>
      ) : null}

      <BrandingSettingsForm
        key={`${org.id}-${org.updatedAt.toISOString()}`}
        orgSlug={orgSlug}
        organizationName={org.name}
        defaultLogoUrl={org.logoUrl ?? ""}
        defaultCardBackgroundUrl={org.cardBackgroundUrl ?? ""}
        defaultPrimaryColor={org.primaryColor}
        defaultSecondaryColor={org.secondaryColor ?? ""}
        defaultDeactivatedBehavior={org.deactivatedBehavior}
        planFeatures={planFeatures}
      />
    </div>
  );
}
