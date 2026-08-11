import { NextResponse } from "next/server";
import { MembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBearerUser } from "@/lib/httpAuth";
import { generateCardText } from "@/lib/openai";
import { aiCardScopeFor, aiQuotaUserIdFor, assertCanConsumeAi, consumeAiQuota, getPlanFeatures } from "@/lib/plan";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getBearerUser(req);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const rl = checkRateLimit(`ai-card-mobile:${user.id}`, 10, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  if (!body?.prompt) return NextResponse.json({ error: "Falta el campo prompt" }, { status: 400 });

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: MembershipStatus.active },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return NextResponse.json({ error: "Sin organización activa" }, { status: 403 });

  const org = membership.organization;
  const features = getPlanFeatures(org);
  if (!features.aiEnabled) {
    return NextResponse.json({ error: "Tu plan no incluye IA. Mejorá a Pro para usar esta función." }, { status: 402 });
  }

  const scope = aiCardScopeFor(org);
  const quotaUserId = aiQuotaUserIdFor({ org, scope, actorUserId: user.id });

  try {
    await assertCanConsumeAi({ org, userId: quotaUserId, scope, images: 0, texts: 1 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Cuota agotada" }, { status: 402 });
  }

  const result = await generateCardText({ prompt: body.prompt, locale: "es" });

  await consumeAiQuota({ organizationId: org.id, userId: quotaUserId, scope, images: 0, texts: 1 });

  return NextResponse.json({ text: result });
}
