import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { publicCardPath } from "@/lib/urls";
import { absoluteUrl } from "@/lib/urls";
import { BillingPlan } from "@prisma/client";

export default async function OrgDashboardHome(props: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  const { orgSlug } = await props.params;

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      profiles: {
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          cardSlug: true,
          displayName: true,
          status: true,
        },
      },
      _count: { select: { profiles: true, memberships: true } },
    },
  });

  if (!org) return null;

  return (
    <div className="flex flex-col gap-10">
      {org.plan === BillingPlan.free ? (
        <div className="rounded-xl border border-accent/30 bg-accent/[0.06] px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-heading">
                Desbloqueá todo el potencial de tu tarjeta
              </p>
              <p className="mt-1 text-xs text-muted">
                Con Pro tenés IA para generar contenido, enlaces ilimitados (web, redes, mail) y
                marca personalizada con tus colores y logo.
              </p>
            </div>
            <Link
              href={`/dashboard/${orgSlug}/billing`}
              className="app-btn-primary shrink-0 text-sm"
            >
              Ver planes →
            </Link>
          </div>
        </div>
      ) : null}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-heading">Resumen</h1>
          <p className="mt-1 text-sm text-muted">Vista general de tu organización</p>
        </div>
        {org.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.logoUrl}
            alt=""
            className="h-16 max-w-[260px] shrink-0 rounded-xl border border-black/[0.06] bg-white object-contain p-1.5 shadow-[var(--shadow-card)] sm:h-[4.5rem] sm:max-w-[280px]"
          />
        ) : null}
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="app-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Tarjetas</p>
          <p className="mt-2 text-3xl font-semibold text-heading">{org._count.profiles}</p>
        </div>
        <div className="app-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Miembros</p>
          <p className="mt-2 text-3xl font-semibold text-heading">{org._count.memberships}</p>
        </div>
        <div className="app-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Tu cuenta</p>
          <p className="mt-2 break-all text-sm text-body">
            {session?.user?.email ? session.user.email : "—"}
          </p>
        </div>
      </section>

      <section className="app-card p-8">
        <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] pb-4">
          <h2 className="text-base font-semibold text-heading">Tarjetas recientes</h2>
          <Link className="app-link text-sm" href={`/dashboard/${orgSlug}/cards`}>
            Ver todas
          </Link>
        </div>
        <div className="mt-5 grid gap-3">
          {org.profiles.length === 0 ? (
            <p className="text-sm text-muted">Aún no hay tarjetas.</p>
          ) : (
            org.profiles.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-[12px] border border-black/[0.06] bg-page/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-heading">{p.displayName}</p>
                  <p className="font-mono text-xs text-muted">
                    {absoluteUrl(publicCardPath(orgSlug, p.cardSlug))}
                  </p>
                  <p className="text-xs text-muted">Estado: {p.status}</p>
                </div>
                <Link
                  className="app-link text-sm"
                  href={`/card/${orgSlug}/${p.cardSlug}`}
                  target="_blank"
                >
                  Ver público
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
