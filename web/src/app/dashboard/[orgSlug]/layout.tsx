import { notFound, redirect } from "next/navigation";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getMembershipForUser } from "@/lib/authz";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default async function OrgDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orgSlug } = await params;
  const row = await getMembershipForUser(orgSlug, session.user.id);
  if (!row || row.membership.status !== MembershipStatus.active) notFound();

  const isAdmin = row.membership.role === MembershipRole.admin;
  const isPersonal = row.org.kind === "personal";

  const tabs = [
    { href: `/dashboard/${orgSlug}`, label: "Resumen" },
    { href: `/dashboard/${orgSlug}/cards`, label: isPersonal ? "Mi tarjeta" : "Tarjetas" },
    { href: `/dashboard/${orgSlug}/analytics`, label: "Analítica" },
    ...(isAdmin && !isPersonal
      ? [{ href: `/dashboard/${orgSlug}/team`, label: "Equipo" }]
      : []),
    ...(isAdmin ? [{ href: `/dashboard/${orgSlug}/settings`, label: "Marca" }] : []),
    ...(isAdmin ? [{ href: `/dashboard/${orgSlug}/billing`, label: "Plan y pagos" }] : []),
  ];

  const email = session.user.email ?? "";

  const periodEndMs = row.org.currentPeriodEnd ? row.org.currentPeriodEnd.getTime() : null;
  // eslint-disable-next-line react-hooks/purity -- ts-rendering del server: queremos la hora actual
  const nowMs = Date.now();
  const planExpired =
    periodEndMs !== null && periodEndMs < nowMs && row.org.plan !== "free";
  const planExpiresSoon =
    periodEndMs !== null && periodEndMs - nowMs < 5 * 24 * 60 * 60 * 1000 && periodEndMs - nowMs > 0;

  return (
    <div className="flex min-h-screen bg-page">
      <DashboardSidebar
        orgSlug={orgSlug}
        orgName={row.org.name}
        logoUrl={row.org.logoUrl}
        userEmail={email}
        tabs={tabs}
        plan={row.org.plan}
        kind={row.org.kind}
        inTrial={row.org.inTrial}
        currentPeriodEndIso={row.org.currentPeriodEnd ? row.org.currentPeriodEnd.toISOString() : null}
        planExpired={planExpired}
        planExpiresSoon={planExpiresSoon}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-6 py-10 sm:px-10">{children}</main>
      </div>
    </div>
  );
}
