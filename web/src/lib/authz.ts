import {
  MembershipRole,
  MembershipStatus,
  type Organization,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getOrgBySlug(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}

export async function getMembershipForUser(orgSlug: string, userId: string) {
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      memberships: {
        where: { userId },
      },
    },
  });
  if (!org) return null;
  const membership = org.memberships[0] ?? null;
  if (!membership) return null;
  return { org, membership };
}

export async function requireOrgAccess(orgSlug: string, userId: string) {
  const row = await getMembershipForUser(orgSlug, userId);
  if (!row || row.membership.status !== MembershipStatus.active) {
    throw new Error("Sin acceso a esta organización");
  }
  return row;
}

export async function requireOrgAdmin(orgSlug: string, userId: string) {
  const row = await requireOrgAccess(orgSlug, userId);
  if (row.membership.role !== MembershipRole.admin) {
    throw new Error("Se requiere rol administrador");
  }
  return row;
}

export async function listUserOrganizations(userId: string) {
  return prisma.organization.findMany({
    where: {
      memberships: {
        some: {
          userId,
          status: MembershipStatus.active,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export type OrgWithMembership = {
  org: Organization;
  membership: { role: MembershipRole; status: MembershipStatus };
};

/** Admin siempre; si la tarjeta no tiene propietario, cualquier miembro activo puede editarla; si tiene, solo ese usuario o admin. */
export function canUserEditProfile(input: {
  membership: { role: MembershipRole; status: MembershipStatus };
  profileOwnerUserId: string | null;
  userId: string;
}): boolean {
  const { membership, profileOwnerUserId, userId } = input;
  if (membership.status !== MembershipStatus.active) return false;
  if (membership.role === MembershipRole.admin) return true;
  if (profileOwnerUserId === null) return true;
  return profileOwnerUserId === userId;
}
