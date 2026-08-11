import { NextResponse } from "next/server";
import { z } from "zod";
import {
  BillingPlan,
  MembershipRole,
  MembershipStatus,
  OrganizationKind,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { validateHandle } from "@/lib/handles";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  handle: z.string().min(3).max(32),
  email: z.string().email().max(180),
  password: z.string().min(8).max(128),
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Sufijo numérico automático: prueba `juan-perez`, `juan-perez-2`, ... */
async function pickAvailableHandle(base: string): Promise<string> {
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (candidate.length > 32) continue;
    const taken = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  throw new Error("No pudimos encontrar un identificador disponible. Probá otro nombre.");
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Datos inválidos. Revisá los campos.");
  }

  const handleErr = validateHandle(parsed.data.handle);
  if (handleErr) return jsonError(handleErr);

  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return jsonError("Ese email ya está registrado. Iniciá sesión o usá otro.", 409);
  }

  const finalHandle = await pickAvailableHandle(parsed.data.handle.toLowerCase());

  const passwordHash = await hashPassword(parsed.data.password);
  const displayName = parsed.data.name.trim();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: displayName,
      },
    });

    const org = await tx.organization.create({
      data: {
        name: displayName,
        slug: finalHandle,
        kind: OrganizationKind.personal,
        plan: BillingPlan.free,
        seats: 1,
        memberships: {
          create: {
            userId: user.id,
            role: MembershipRole.admin,
            status: MembershipStatus.active,
          },
        },
      },
    });

    await tx.profile.create({
      data: {
        organizationId: org.id,
        ownerUserId: user.id,
        cardSlug: "me",
        displayName,
        links: {
          create: [
            // Sin enlaces por defecto: en Free solo se puede agregar un WhatsApp.
            // Dejamos un enlace placeholder vacío para que vea el editor.
          ],
        },
      },
    });

    return { handle: org.slug };
  });

  return NextResponse.json({ ok: true, handle: result.handle });
}
