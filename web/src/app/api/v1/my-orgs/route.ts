import { NextResponse } from "next/server";
import { MembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBearerUser } from "@/lib/httpAuth";
import { effectivePlan } from "@/lib/plan";

function planLabel(org: Parameters<typeof effectivePlan>[0]): "gratis" | "pro" | "empresa" {
  const p = effectivePlan(org);
  if (p === "pro") return "pro";
  if (p === "business") return "empresa";
  return "gratis";
}

export async function GET(req: Request) {
  const user = await getBearerUser(req);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: MembershipStatus.active },
    include: {
      organization: {
        select: {
          id: true,
          slug: true,
          name: true,
          kind: true,
          plan: true,
          currentPeriodEnd: true,
          inTrial: true,
          profiles: {
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
      },
    },
  });

  const result = memberships.map((m) => ({
    orgSlug: m.organization.slug,
    orgName: m.organization.name,
    orgKind: m.organization.kind,
    plan: planLabel(m.organization),
    profiles: m.organization.profiles,
  }));

  return NextResponse.json(result);
}
