import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { acceptInviteFromForm } from "@/server/invite";

export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const invite = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invite) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-heading">Invitación no encontrada</h1>
        <Link className="app-link mt-4 inline-block text-sm" href="/">
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (invite.acceptedAt) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-heading">Invitación ya usada</h1>
        <Link className="app-link mt-4 inline-block text-sm" href="/login">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-heading">Invitación expirada</h1>
        <p className="mt-2 text-sm text-muted">Pide a tu empresa una invitación nueva.</p>
      </div>
    );
  }

  const session = await auth();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-heading">Invitación</h1>
        <p className="mt-2 text-sm text-muted">
          Te invitaron a <span className="font-medium text-body">{invite.organization.name}</span> como{" "}
          <span className="font-mono">{invite.role}</span>.
        </p>
        <p className="mt-2 text-sm text-muted">
          Email de la invitación: <span className="font-mono">{invite.email}</span>
        </p>
      </div>

      {!session?.user ? (
        <div className="app-card p-6 text-sm text-body">
          <p>
            Para aceptar, inicia sesión con el mismo email ({invite.email}) o{" "}
            <Link className="app-link font-medium" href="/register">
              crea una cuenta
            </Link>
            .
          </p>
          <Link className="app-btn-primary mt-4 inline-flex w-full" href="/login">
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <form action={acceptInviteFromForm.bind(null, token)} className="app-card flex flex-col gap-4 p-6">
          <p className="text-sm text-body">
            Sesión actual: <span className="font-mono">{session.user.email}</span>
          </p>
          <button type="submit" className="app-btn-primary w-full">
            Aceptar invitación
          </button>
        </form>
      )}
    </div>
  );
}
