import { NextResponse } from "next/server";
import { MembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBearerUser } from "@/lib/httpAuth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const user = await getBearerUser(req);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { profileId } = await params;

  const profile = await prisma.profile.findFirst({
    where: {
      id: profileId,
      organization: { memberships: { some: { userId: user.id, status: MembershipStatus.active } } },
    },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [weekViews, monthViews, totalViews] = await Promise.all([
    prisma.cardView.count({ where: { profileId, viewedAt: { gte: weekAgo } } }),
    prisma.cardView.count({ where: { profileId, viewedAt: { gte: monthAgo } } }),
    prisma.cardView.count({ where: { profileId } }),
  ]);

  return NextResponse.json({ weekViews, monthViews, totalViews });
}
