import { prisma } from "@/lib/prisma";
import { BillingPlan } from "@prisma/client";

export default async function AdminPage() {
  const [
    totalUsers,
    totalOrgs,
    totalProfiles,
    totalViews,
    orgsByPlan,
    recentOrgs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.profile.count(),
    prisma.cardView.count(),
    prisma.organization.groupBy({
      by: ["plan"],
      _count: { _all: true },
    }),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        kind: true,
        billingStatus: true,
        createdAt: true,
        _count: { select: { profiles: true, memberships: true } },
      },
    }),
  ]);

  const planCount = (plan: BillingPlan) =>
    orgsByPlan.find((r) => r.plan === plan)?._count._all ?? 0;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-heading">Panel de administración</h1>
        <p className="mt-1 text-sm text-muted">Vista general de la plataforma.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Usuarios" value={totalUsers} />
        <StatCard label="Organizaciones" value={totalOrgs} />
        <StatCard label="Tarjetas" value={totalProfiles} />
        <StatCard label="Vistas de tarjetas" value={totalViews} />
      </div>

      <div className="app-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-heading">Organizaciones por plan</h2>
        <div className="grid grid-cols-3 gap-3">
          <PlanBadge plan="free" count={planCount(BillingPlan.free)} />
          <PlanBadge plan="pro" count={planCount(BillingPlan.pro)} />
          <PlanBadge plan="business" count={planCount(BillingPlan.business)} />
        </div>
      </div>

      <div className="app-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-heading">Organizaciones recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-left text-xs text-muted">
                <th className="pb-2 pr-4 font-medium">Nombre / Slug</th>
                <th className="pb-2 pr-4 font-medium">Tipo</th>
                <th className="pb-2 pr-4 font-medium">Plan</th>
                <th className="pb-2 pr-4 font-medium">Billing</th>
                <th className="pb-2 pr-4 font-medium">Tarjetas</th>
                <th className="pb-2 font-medium">Creada</th>
              </tr>
            </thead>
            <tbody>
              {recentOrgs.map((org) => (
                <tr key={org.id} className="border-b border-black/[0.04] last:border-0">
                  <td className="py-2 pr-4">
                    <p className="font-medium text-heading">{org.name}</p>
                    <p className="font-mono text-xs text-muted">{org.slug}</p>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted">{org.kind}</td>
                  <td className="py-2 pr-4">
                    <span className="rounded-full bg-black/[0.05] px-2 py-0.5 font-mono text-xs">
                      {org.plan}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted">{org.billingStatus}</td>
                  <td className="py-2 pr-4 text-xs text-muted">{org._count.profiles}</td>
                  <td className="py-2 text-xs text-muted">
                    {org.createdAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="app-card flex flex-col gap-1 p-5">
      <p className="text-2xl font-bold text-heading">{value.toLocaleString("es")}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function PlanBadge({ plan, count }: { plan: string; count: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-[12px] border border-black/[0.06] py-4">
      <p className="text-xl font-bold text-heading">{count}</p>
      <p className="font-mono text-xs text-muted">{plan}</p>
    </div>
  );
}
