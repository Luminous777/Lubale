import { redirect } from "next/navigation";
import { MembershipStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembershipForUser } from "@/lib/authz";
import { absoluteUrl, publicCardPath } from "@/lib/urls";
import Link from "next/link";

export const metadata = { title: "Analítica" };

export default async function AnalyticsPage(props: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orgSlug } = await props.params;
  const row = await getMembershipForUser(orgSlug, session.user.id);
  if (!row || row.membership.status !== MembershipStatus.active) redirect("/dashboard");

  const profiles = await prisma.profile.findMany({
    where: { organizationId: row.org.id },
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      displayName: true,
      cardSlug: true,
      status: true,
      _count: { select: { views: true } },
      links: {
        select: {
          id: true,
          title: true,
          url: true,
          kind: true,
          _count: { select: { clicks: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const totalViews = profiles.reduce((s, p) => s + p._count.views, 0);
  const totalClicks = profiles.reduce(
    (s, p) => s + p.links.reduce((ls, l) => ls + l._count.clicks, 0),
    0,
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-black/[0.06] pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-heading">Analítica</h1>
        <p className="mt-1 text-sm text-muted">
          Vistas de tarjetas (escaneos de QR o visitas directas) y clicks en links.
        </p>
      </header>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="app-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Vistas totales
          </p>
          <p className="mt-2 text-3xl font-bold text-heading">{totalViews.toLocaleString("es")}</p>
          <p className="mt-1 text-xs text-muted">escaneos QR + visitas directas</p>
        </div>
        <div className="app-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Clicks en links
          </p>
          <p className="mt-2 text-3xl font-bold text-heading">{totalClicks.toLocaleString("es")}</p>
          <p className="mt-1 text-xs text-muted">clicks en todos los enlaces</p>
        </div>
        <div className="app-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Tarjetas activas
          </p>
          <p className="mt-2 text-3xl font-bold text-heading">
            {profiles.filter((p) => p.status === "active").length}
          </p>
          <p className="mt-1 text-xs text-muted">de {profiles.length} en total</p>
        </div>
      </div>

      {/* Detalle por tarjeta */}
      {profiles.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay tarjetas.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {profiles.map((p) => {
            const cardClicks = p.links.reduce((s, l) => s + l._count.clicks, 0);
            const topLinks = [...p.links].sort((a, b) => b._count.clicks - a._count.clicks);
            return (
              <div key={p.id} className="app-card overflow-hidden">
                {/* Cabecera de la tarjeta */}
                <div className="flex flex-col gap-3 border-b border-black/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-semibold text-heading">
                        {p.displayName}
                      </h2>
                      <span
                        className={
                          p.status === "active"
                            ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                            : "rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-medium text-muted"
                        }
                      >
                        {p.status === "active" ? "activa" : "desactivada"}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted">
                      {absoluteUrl(publicCardPath(orgSlug, p.cardSlug))}
                    </p>
                  </div>
                  <Link
                    href={`/card/${orgSlug}/${p.cardSlug}`}
                    target="_blank"
                    className="app-link shrink-0 text-xs"
                  >
                    Ver tarjeta
                  </Link>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-2 divide-x divide-black/[0.06] border-b border-black/[0.06]">
                  <div className="px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Vistas / QR escaneado
                    </p>
                    <p className="mt-1 text-2xl font-bold text-heading">
                      {p._count.views.toLocaleString("es")}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Clicks en links
                    </p>
                    <p className="mt-1 text-2xl font-bold text-heading">
                      {cardClicks.toLocaleString("es")}
                    </p>
                  </div>
                </div>

                {/* Tabla de links */}
                {topLinks.length > 0 ? (
                  <div className="p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                      Links (por clicks)
                    </p>
                    <div className="flex flex-col gap-2">
                      {topLinks.map((l) => {
                        const pct =
                          cardClicks > 0
                            ? Math.round((l._count.clicks / cardClicks) * 100)
                            : 0;
                        return (
                          <div key={l.id} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-heading">
                                  {l.title}
                                </span>
                                <span className="ml-2 font-mono text-[11px] text-muted">
                                  {l.kind}
                                </span>
                              </div>
                              <span className="shrink-0 text-sm font-semibold text-heading">
                                {l._count.clicks}{" "}
                                <span className="text-xs font-normal text-muted">
                                  {pct > 0 ? `(${pct}%)` : ""}
                                </span>
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-accent transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="p-5 text-xs text-muted">Sin links configurados.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
