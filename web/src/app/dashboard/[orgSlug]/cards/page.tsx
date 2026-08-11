import Link from "next/link";
import { redirect } from "next/navigation";
import { MembershipStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canUserEditProfile, getMembershipForUser } from "@/lib/authz";
import { absoluteUrl, publicCardPath } from "@/lib/urls";
import { activateProfileForm, deactivateProfileForm } from "@/server/profile";

function slugPreview(slug: string) {
  if (slug.length <= 10) return slug;
  return `.. ${slug.slice(-8)}`;
}

export default async function OrgCardsPage(props: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orgSlug } = await props.params;
  const row = await getMembershipForUser(orgSlug, session.user.id);
  if (!row || row.membership.status !== MembershipStatus.active) redirect("/dashboard");

  const profiles = await prisma.profile.findMany({
    where: { organizationId: row.org.id },
    orderBy: { cardSlug: "asc" },
    include: {
      owner: { select: { email: true } },
      _count: { select: { views: true } },
      links: { select: { _count: { select: { clicks: true } } } },
    },
  });

  const isAdmin = row.membership.role === "admin";
  const userId = session.user.id;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 border-b border-black/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-heading">Tarjetas</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Vista en cuadrícula. El slug estable es lo que conviene imprimir en QR.
          </p>
        </div>
        {isAdmin ? (
          <Link
            href={`/dashboard/${orgSlug}/cards/new`}
            className="app-btn-primary inline-flex shrink-0"
          >
            Nueva tarjeta
          </Link>
        ) : null}
      </header>

      {profiles.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay tarjetas en esta organización.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {profiles.map((p) => {
            const canEdit = canUserEditProfile({
              membership: row.membership,
              profileOwnerUserId: p.ownerUserId,
              userId,
            });
            const initial = p.displayName.trim().slice(0, 1).toUpperCase() || "?";

            return (
              <article
                key={p.id}
                className="app-card group flex h-full min-h-[200px] flex-col p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold tracking-tight text-heading">
                      {p.displayName}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-muted">{slugPreview(p.cardSlug)}</p>
                    <p
                      className={
                        p.status === "active"
                          ? "mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                          : "mt-2 inline-flex rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium text-muted"
                      }
                    >
                      {p.status === "active" ? "Activa" : "Desactivada"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {p._count.views} {p._count.views === 1 ? "vista" : "vistas"}
                      {" · "}
                      {p.links.reduce((s, l) => s + l._count.clicks, 0)} clicks en links
                    </p>
                  </div>
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.photoUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full border border-black/[0.06] object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-accent-soft text-xs font-bold text-accent">
                      {initial}
                    </div>
                  )}
                </div>

                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">
                  {p.owner?.email ? (
                    <>
                      <span className="font-medium text-body">Propietario:</span>{" "}
                      <span className="font-mono">{p.owner.email}</span>
                    </>
                  ) : (
                    "Sin propietario asignado"
                  )}
                </p>

                <div className="mt-auto flex flex-col gap-3 border-t border-black/[0.06] pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="app-btn-ghost flex-1 justify-center py-2 text-center text-xs sm:flex-none"
                      href={`/card/${orgSlug}/${p.cardSlug}`}
                      target="_blank"
                    >
                      Ver público
                    </Link>
                    {canEdit ? (
                      <Link
                        className="app-btn-ghost flex-1 justify-center py-2 text-center text-xs sm:flex-none"
                        href={`/dashboard/${orgSlug}/cards/${p.id}/edit`}
                      >
                        Editar
                      </Link>
                    ) : null}
                  </div>
                  {isAdmin ? (
                    <div className="flex flex-wrap gap-2">
                      {p.status === "active" ? (
                        <form
                          className="contents"
                          action={deactivateProfileForm.bind(null, orgSlug, p.id)}
                        >
                          <button
                            type="submit"
                            className="w-full rounded-full bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-700 sm:w-auto"
                          >
                            Desactivar
                          </button>
                        </form>
                      ) : (
                        <form
                          className="contents"
                          action={activateProfileForm.bind(null, orgSlug, p.id)}
                        >
                          <button type="submit" className="app-btn-secondary w-full py-2 text-xs sm:w-auto">
                            Reactivar
                          </button>
                        </form>
                      )}
                    </div>
                  ) : null}
                  <p className="truncate font-mono text-[10px] text-muted/90" title={absoluteUrl(publicCardPath(orgSlug, p.cardSlug))}>
                    {absoluteUrl(publicCardPath(orgSlug, p.cardSlug))}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
