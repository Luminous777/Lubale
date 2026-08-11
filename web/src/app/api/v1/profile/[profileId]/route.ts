import { NextResponse } from "next/server";
import { MembershipStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getBearerUser } from "@/lib/httpAuth";
import { detectProfileLinkKind } from "@/lib/profileLinkKind";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const user = await getBearerUser(req);
  if (!user) return jsonError("No autenticado", 401);

  const { profileId } = await params;

  const profile = await prisma.profile.findFirst({
    where: {
      id: profileId,
      organization: {
        memberships: {
          some: { userId: user.id, status: MembershipStatus.active },
        },
      },
    },
    include: {
      organization: {
        select: {
          id: true,
          slug: true,
          name: true,
          kind: true,
          plan: true,
          logoUrl: true,
          cardBackgroundUrl: true,
          primaryColor: true,
          secondaryColor: true,
        },
      },
      links: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!profile) return jsonError("Perfil no encontrado", 404);

  return NextResponse.json(profile);
}

const linkSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(80),
  url: z.string().min(1).max(500),
  sortOrder: z.number().int().default(0),
});

const updateSchema = z.object({
  displayName: z.string().min(1).max(120),
  title: z.string().max(120).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().max(40).optional(),
  emailPublic: z.string().email().max(180).optional().or(z.literal("")),
  photoUrl: z.string().max(500).optional(),
  links: z.array(linkSchema).max(20).default([]),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const user = await getBearerUser(req);
  if (!user) return jsonError("No autenticado", 401);

  const { profileId } = await params;

  const profile = await prisma.profile.findFirst({
    where: {
      id: profileId,
      organization: {
        memberships: {
          some: { userId: user.id, status: MembershipStatus.active },
        },
      },
    },
    include: { organization: { select: { id: true, slug: true, plan: true, kind: true } } },
  });

  if (!profile) return jsonError("Perfil no encontrado", 404);

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Payload inválido", 400);
  }

  const { displayName, title, bio, phone, emailPublic, photoUrl, links } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.profileLink.deleteMany({ where: { profileId } });

    if (links.length > 0) {
      await tx.profileLink.createMany({
        data: links.map((l, i) => ({
          profileId,
          title: l.title,
          url: l.url,
          kind: detectProfileLinkKind(l.url),
          sortOrder: l.sortOrder ?? i,
        })),
      });
    }

    return tx.profile.update({
      where: { id: profileId },
      data: {
        displayName,
        title: title ?? null,
        bio: bio ?? null,
        phone: phone ?? null,
        emailPublic: emailPublic || null,
        photoUrl: photoUrl ?? null,
      },
      include: {
        organization: { select: { id: true, slug: true, name: true, kind: true, plan: true } },
        links: { orderBy: { sortOrder: "asc" } },
      },
    });
  });

  return NextResponse.json(updated);
}
