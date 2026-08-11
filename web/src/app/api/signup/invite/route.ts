import { NextResponse } from "next/server";
import { z } from "zod";
import { MembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  inviteCode: z.string().min(1).max(200),
  name: z.string().min(1).max(120),
  email: z.string().email().max(180),
  password: z.string().min(8).max(128),
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function pickAvailableCardSlug(orgId: string, base: string): Promise<string> {
  const slug = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "empleado";

  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    if (candidate.length > 32) continue;
    const taken = await prisma.profile.findFirst({
      where: { organizationId: orgId, cardSlug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  throw new Error("No se pudo generar un identificador único para el perfil.");
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`signup-invite:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return jsonError("Datos inválidos. Revisá los campos.");

  const { inviteCode, name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  const invitation = await prisma.invitation.findUnique({
    where: { token: inviteCode },
    include: {
      organization: { select: { id: true, slug: true, name: true } },
    },
  });

  if (!invitation) return jsonError("Código de invitación inválido.");
  if (invitation.email.toLowerCase() !== email) {
    return jsonError("Este código de invitación fue enviado a otro email.");
  }
  if (invitation.expiresAt < new Date()) {
    return jsonError("El código de invitación venció. Pedile uno nuevo a tu empresa.");
  }
  if (invitation.acceptedAt) {
    return jsonError("Este código de invitación ya fue usado.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return jsonError("Ya existe una cuenta con ese email.", 409);

  const displayName = name.trim();
  const passwordHash = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, name: displayName },
    });

    const cardSlug = await pickAvailableCardSlug(invitation.organization.id, displayName);

    if (invitation.profileId) {
      await tx.profile.update({
        where: { id: invitation.profileId },
        data: { ownerUserId: user.id, displayName },
      });
    } else {
      await tx.profile.create({
        data: {
          organizationId: invitation.organization.id,
          ownerUserId: user.id,
          cardSlug,
          displayName,
        },
      });
    }

    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: invitation.organization.id,
        role: invitation.role,
        status: MembershipStatus.active,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return {
      orgSlug: invitation.organization.slug,
      orgName: invitation.organization.name,
    };
  });

  return NextResponse.json({ ok: true, ...result });
}
