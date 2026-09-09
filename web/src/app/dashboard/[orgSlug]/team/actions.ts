'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';
import { sendInviteEmail } from '@/lib/email';

async function admin(orgSlug: string) {
  const ctx = await requireMembership(orgSlug);
  if (!ctx.isAdmin) throw new Error('Solo los admins pueden gestionar el equipo.');
  return ctx;
}

export async function inviteMember({
  orgSlug,
  email: raw,
  role,
  profileId,
}: {
  orgSlug: string;
  email: string;
  role: 'agent' | 'admin';
  profileId: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { org } = await admin(orgSlug);
  const email = raw.trim().toLowerCase();
  if (!/\S+@\S+\.\S+/.test(email)) return { ok: false, error: 'Email inválido.' };

  const used = await prisma.membership.count({
    where: { organizationId: org.id, status: { not: 'disabled' } },
  });
  if (used >= (org.seats ?? 1)) return { ok: false, error: 'No hay asientos libres.' };

  const already = await prisma.membership.findFirst({
    where: { organizationId: org.id, user: { email } },
  });
  if (already) return { ok: false, error: 'Ya es parte del equipo.' };

  // invalida invitación viva previa para el mismo email
  await prisma.invitation.updateMany({
    where: { organizationId: org.id, email, acceptedAt: null },
    data:  { expiresAt: new Date() },
  });

  const token = randomBytes(24).toString('base64url');
  await prisma.invitation.create({
    data: {
      organizationId: org.id,
      email,
      role,
      profileId,
      token,
      expiresAt: new Date(Date.now() + 7 * 864e5),
    },
  });

  await sendInviteEmail({ to: email, orgName: org.name, url: `https://lubela.app/invite/${token}` });
  revalidatePath(`/dashboard/${orgSlug}/team`);
  return { ok: true };
}

export async function resendInvite(formData: FormData) {
  const orgSlug   = String(formData.get('orgSlug'));
  const inviteId  = String(formData.get('inviteId'));
  const { org }   = await admin(orgSlug);

  const invite = await prisma.invitation.findFirst({
    where: { id: inviteId, organizationId: org.id, acceptedAt: null },
  });
  if (!invite) throw new Error('Invitación no encontrada.');

  const token = randomBytes(24).toString('base64url');
  await prisma.invitation.update({
    where: { id: invite.id },
    data:  { token, expiresAt: new Date(Date.now() + 7 * 864e5) },
  });

  await sendInviteEmail({
    to:      invite.email,
    orgName: org.name,
    url:     `https://lubela.app/invite/${token}`,
  });
  revalidatePath(`/dashboard/${orgSlug}/team`);
}

export async function revokeInvite(formData: FormData) {
  const orgSlug  = String(formData.get('orgSlug'));
  const inviteId = String(formData.get('inviteId'));
  const { org }  = await admin(orgSlug);

  await prisma.invitation.updateMany({
    where: { id: inviteId, organizationId: org.id, acceptedAt: null },
    data:  { expiresAt: new Date() },
  });
  revalidatePath(`/dashboard/${orgSlug}/team`);
}

export async function setMemberRole({
  orgSlug,
  membershipId,
  role,
}: {
  orgSlug: string;
  membershipId: string;
  role: 'agent' | 'admin';
}) {
  const { org } = await admin(orgSlug);

  if (role === 'agent') {
    const admins = await prisma.membership.count({
      where: { organizationId: org.id, role: 'admin', status: 'active' },
    });
    const target = await prisma.membership.findFirst({
      where:  { id: membershipId, organizationId: org.id },
      select: { role: true },
    });
    if (admins <= 1 && target?.role === 'admin')
      throw new Error('Tiene que quedar al menos un admin.');
  }

  await prisma.membership.updateMany({
    where: { id: membershipId, organizationId: org.id },
    data:  { role },
  });
  revalidatePath(`/dashboard/${orgSlug}/team`);
}

export async function setMemberStatus({
  orgSlug,
  membershipId,
  status,
}: {
  orgSlug: string;
  membershipId: string;
  status: 'active' | 'disabled';
}) {
  const { org, user } = await admin(orgSlug);

  const target = await prisma.membership.findFirst({
    where:  { id: membershipId, organizationId: org.id },
    select: { userId: true, role: true },
  });
  if (!target) throw new Error('Miembro no encontrado.');
  if (target.userId === user.id) throw new Error('No podés desactivarte a vos mismo.');

  if (status === 'disabled' && target.role === 'admin') {
    const admins = await prisma.membership.count({
      where: { organizationId: org.id, role: 'admin', status: 'active' },
    });
    if (admins <= 1) throw new Error('Tiene que quedar al menos un admin activo.');
  }

  await prisma.membership.update({ where: { id: membershipId }, data: { status } });
  revalidatePath(`/dashboard/${orgSlug}/team`);
}

export async function assignCard({
  orgSlug,
  membershipId,
  profileId,
}: {
  orgSlug: string;
  membershipId: string;
  profileId: string | null;
}) {
  const { org } = await admin(orgSlug);

  const membership = await prisma.membership.findFirst({
    where:  { id: membershipId, organizationId: org.id },
    select: { userId: true, profileId: true },
  });
  if (!membership) throw new Error('Miembro no encontrado.');

  if (profileId) {
    const profile = await prisma.profile.findFirst({
      where:  { id: profileId, organizationId: org.id },
      select: { id: true },
    });
    if (!profile) throw new Error('Tarjeta no encontrada.');
  }

  await prisma.$transaction([
    // libera la tarjeta anterior
    ...(membership.profileId
      ? [prisma.profile.update({ where: { id: membership.profileId }, data: { ownerUserId: null } })]
      : []),
    prisma.membership.update({ where: { id: membershipId }, data: { profileId } }),
    ...(profileId
      ? [prisma.profile.update({ where: { id: profileId }, data: { ownerUserId: membership.userId } })]
      : []),
  ]);

  revalidatePath(`/dashboard/${orgSlug}/team`);
  revalidatePath(`/dashboard/${orgSlug}/cards`);
}
