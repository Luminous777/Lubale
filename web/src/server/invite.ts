"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/authz";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { absoluteUrl } from "@/lib/urls";

function inviteLink(token: string) {
  return absoluteUrl(`/invite/${token}`);
}

export async function inviteMemberAction(
  orgSlug: string,
  _prev: unknown,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const { org } = await requireOrgAdmin(orgSlug, session.user.id);

  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const roleRaw = String(formData.get("role") ?? "agent");
  const role = roleRaw === "admin" ? MembershipRole.admin : MembershipRole.agent;
  if (!email || !email.includes("@")) return { error: "Email inválido" };

  const profileIdRaw = String(formData.get("profileId") ?? "").trim();
  const profileId =
    profileIdRaw.length > 0
      ? (
          await prisma.profile.findFirst({
            where: { id: profileIdRaw, organizationId: org.id },
          })
        )?.id ?? null
      : null;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: existingUser.id,
        },
      },
    });
    if (membership?.status === MembershipStatus.active) {
      return { error: "Ese usuario ya es miembro activo" };
    }
  }

  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  await prisma.invitation.create({
    data: {
      token,
      email,
      organizationId: org.id,
      role,
      profileId,
      expiresAt,
    },
  });

  const url = inviteLink(token);
  if (process.env.RESEND_API_KEY) {
    // Integración email opcional: aquí iría Resend
  } else {
    console.info(`[invite] ${email} -> ${url}`);
  }

  revalidatePath(`/dashboard/${orgSlug}/team`);
  return { ok: true, inviteUrl: url };
}

export async function acceptInvitationAction(token: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Debes iniciar sesión para aceptar" };

  const invite = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });
  if (!invite) return { error: "Invitación no encontrada" };
  if (invite.acceptedAt) return { error: "Invitación ya usada" };
  if (invite.expiresAt < new Date()) return { error: "Invitación expirada" };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return { error: "Esta invitación es para otro email" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId: user.id,
        },
      },
      create: {
        organizationId: invite.organizationId,
        userId: user.id,
        role: invite.role,
        status: MembershipStatus.active,
      },
      update: {
        role: invite.role,
        status: MembershipStatus.active,
      },
    });

    if (invite.profileId) {
      await tx.profile.updateMany({
        where: { id: invite.profileId, organizationId: invite.organizationId },
        data: { ownerUserId: user.id },
      });
    }

    await tx.invitation.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${invite.organization.slug}/team`);
  return { ok: true, orgSlug: invite.organization.slug };
}

export async function inviteMemberForm(
  orgSlug: string,
  formData: FormData,
): Promise<void> {
  const res = await inviteMemberAction(orgSlug, null, formData);
  if (res && "error" in res) throw new Error(res.error);
  redirect(`/dashboard/${orgSlug}/team`);
}

export async function acceptInviteFromForm(token: string): Promise<void> {
  const res = await acceptInvitationAction(token);
  if ("error" in res) {
    throw new Error(res.error);
  }
  if ("ok" in res && res.ok) {
    redirect(`/dashboard/${res.orgSlug}/team`);
  }
  throw new Error("No se pudo aceptar");
}

export async function renewInvitationForm(
  orgSlug: string,
  inviteId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { org } = await requireOrgAdmin(orgSlug, session.user.id);

  const invite = await prisma.invitation.findFirst({
    where: { id: inviteId, organizationId: org.id, acceptedAt: null },
  });
  if (!invite) throw new Error("Invitación no encontrada");

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  await prisma.invitation.update({
    where: { id: inviteId },
    data: { expiresAt },
  });

  revalidatePath(`/dashboard/${orgSlug}/team`);
  redirect(`/dashboard/${orgSlug}/team`);
}
