import { redirect } from "next/navigation";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembershipForUser } from "@/lib/authz";
import { inviteMemberForm, renewInvitationForm } from "@/server/invite";

export default async function OrgTeamPage(props: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orgSlug } = await props.params;
  const row = await getMembershipForUser(orgSlug, session.user.id);
  if (!row || row.membership.status !== MembershipStatus.active) redirect("/dashboard");
  if (row.membership.role !== MembershipRole.admin) redirect(`/dashboard/${orgSlug}`);

  const memberships = await prisma.membership.findMany({
    where: { organizationId: row.org.id },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const invites = await prisma.invitation.findMany({
    where: { organizationId: row.org.id, acceptedAt: null },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const profiles = await prisma.profile.findMany({
    where: { organizationId: row.org.id },
    orderBy: { cardSlug: "asc" },
    select: { id: true, cardSlug: true, displayName: true },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <header className="border-b border-black/[0.06] pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-heading">Equipo</h1>
        <p className="mt-2 text-sm text-muted">
          Invita por email. Si asocias una tarjeta, al aceptar se asignará como propietario.
        </p>
      </header>

      <form action={inviteMemberForm.bind(null, orgSlug)} className="app-card flex flex-col gap-4 p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-heading">Email</span>
            <input name="email" type="email" required className="app-input w-full" />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-heading">Rol</span>
            <select name="role" className="app-input w-full" defaultValue="agent">
              <option value="agent">Agente</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Asociar tarjeta (opcional)</span>
          <select name="profileId" className="app-input w-full" defaultValue="">
            <option value="">(ninguna)</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.cardSlug} — {p.displayName}
              </option>
            ))}
          </select>
        </label>
        <button className="app-btn-primary w-full sm:w-auto" type="submit">
          Crear invitación
        </button>
        <p className="text-xs text-muted">
          En desarrollo sin proveedor de email, el enlace se imprime en la consola del servidor.
        </p>
      </form>

      <section className="app-card p-8">
        <h3 className="text-sm font-semibold text-heading">Miembros</h3>
        <div className="mt-4 grid gap-2">
          {memberships.map((m) => (
            <div
              key={m.id}
              className="flex flex-col rounded-[12px] border border-black/[0.06] bg-page/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-heading">{m.user.email}</p>
                <p className="text-xs text-muted">
                  Rol: <span className="font-mono">{m.role}</span> · Estado:{" "}
                  <span className="font-mono">{m.status}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="app-card p-8">
        <h3 className="text-sm font-semibold text-heading">Invitaciones pendientes</h3>
        <div className="mt-4 grid gap-2">
          {invites.length === 0 ? (
            <p className="text-sm text-muted">No hay invitaciones pendientes.</p>
          ) : (
            invites.map((i) => {
              const expired = i.expiresAt < new Date();
              return (
                <div
                  key={i.id}
                  className={`rounded-[12px] border bg-page/40 px-4 py-3 ${
                    expired ? "border-amber-200" : "border-black/[0.06]"
                  }`}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-heading">{i.email}</p>
                      <p className="text-xs text-muted">
                        {expired ? (
                          <span className="font-medium text-amber-600">Vencida</span>
                        ) : (
                          <>Expira: {i.expiresAt.toISOString().slice(0, 10)}</>
                        )}{" "}
                        · Rol: <span className="font-mono">{i.role}</span>
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-body">
                        /invite/{i.token}
                      </p>
                    </div>
                    <form action={renewInvitationForm.bind(null, orgSlug, i.id)} className="shrink-0">
                      <button
                        type="submit"
                        className="mt-2 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-heading shadow-sm transition hover:bg-black/[0.04] sm:mt-0"
                      >
                        {expired ? "Renovar (14 días)" : "Extender (14 días)"}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
