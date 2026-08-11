import { NextResponse } from "next/server";
import { MembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBearerUser } from "@/lib/httpAuth";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ orgSlug: string }> },
) {
  const user = await getBearerUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { orgSlug } = await ctx.params;
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      memberships: {
        where: { userId: user.id, status: MembershipStatus.active },
      },
      profiles: {
        orderBy: { cardSlug: "asc" },
        select: {
          id: true,
          cardSlug: true,
          displayName: true,
          title: true,
          status: true,
          ownerUserId: true,
        },
      },
    },
  });

  if (!org || org.memberships.length === 0) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    organization: { id: org.id, slug: org.slug, name: org.name },
    profiles: org.profiles,
  });
}
