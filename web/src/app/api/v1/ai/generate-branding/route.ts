import { NextResponse } from "next/server";
import { z } from "zod";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getMembershipForUser } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import {
  generateBrandingPalette,
  generateImageBase64,
  type BrandingResult,
} from "@/lib/openai";
import { saveAiImage } from "@/lib/aiStorage";
import {
  aiBrandingScopeFor,
  aiQuotaUserIdFor,
  assertCanConsumeAi,
  consumeAiQuota,
  getPlanFeatures,
  readAiQuota,
} from "@/lib/plan";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 120;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const bodySchema = z.object({
  orgSlug: z.string().min(1),
  prompt: z.string().min(3).max(2000),
  wantLogo: z.boolean().default(true),
  wantPalette: z.boolean().default(true),
  wantBackground: z.boolean().default(false),
});

type GenerateBrandingResponse = {
  palette?: BrandingResult;
  logoUrl?: string;
  cardBackgroundUrl?: string;
  warnings: string[];
  quota?: {
    imagesRemaining: number;
    textsRemaining: number;
  };
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("No autenticado", 401);

  const rl = checkRateLimit(`ai-branding:${session.user.id}`, 10, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("JSON inválido", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Payload inválido", 400);
  }

  const { orgSlug, prompt, wantLogo, wantPalette, wantBackground } = parsed.data;

  const row = await getMembershipForUser(orgSlug, session.user.id);
  if (!row || row.membership.status !== MembershipStatus.active) {
    return jsonError("Sin acceso a la organización", 403);
  }
  if (row.membership.role !== MembershipRole.admin) {
    return jsonError("Solo administradores pueden generar branding", 403);
  }

  const features = getPlanFeatures(row.org);
  if (!features.aiEnabled || !features.customBrandingEnabled) {
    return jsonError(
      "Tu plan actual no incluye personalización de marca con IA. Mejorá a Pro o Empresa.",
      402,
    );
  }

  if (!wantLogo && !wantPalette && !wantBackground) {
    return jsonError("Elegí al menos una salida (logo, paleta o fondo)", 400);
  }

  const scope = aiBrandingScopeFor(row.org);
  const quotaUserId = aiQuotaUserIdFor({
    org: row.org,
    scope,
    actorUserId: session.user.id,
  });
  const imagesNeeded = (wantLogo ? 1 : 0) + (wantBackground ? 1 : 0);
  const textsNeeded = wantPalette ? 1 : 0;
  try {
    await assertCanConsumeAi({
      org: row.org,
      userId: quotaUserId,
      scope,
      images: imagesNeeded,
      texts: textsNeeded,
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Sin cupo de IA", 402);
  }

  const result: GenerateBrandingResponse = { warnings: [] };

  let palette: BrandingResult | undefined;
  if (wantPalette) {
    try {
      palette = await generateBrandingPalette(prompt);
      result.palette = palette;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      result.warnings.push(`No se pudo generar la paleta: ${msg}`);
    }
  }

  if (wantLogo) {
    try {
      const logoPrompt = buildLogoPrompt({ prompt, palette });
      const b64 = await generateImageBase64({
        prompt: logoPrompt,
        size: "1024x1024",
        quality: "medium",
      });
      result.logoUrl = await saveAiImage({
        orgSlug,
        subfolder: "logos",
        base64: b64,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      result.warnings.push(`No se pudo generar el logo: ${msg}`);
    }
  }

  if (wantBackground) {
    try {
      const bgPrompt = buildBackgroundPrompt({ prompt, palette });
      const b64 = await generateImageBase64({
        prompt: bgPrompt,
        size: "1024x1536",
        quality: "medium",
      });
      result.cardBackgroundUrl = await saveAiImage({
        orgSlug,
        subfolder: "card-bg",
        base64: b64,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      result.warnings.push(`No se pudo generar el fondo: ${msg}`);
    }
  }

  const imagesGenerated = (result.logoUrl ? 1 : 0) + (result.cardBackgroundUrl ? 1 : 0);
  const textsGenerated = result.palette ? 1 : 0;
  if (imagesGenerated > 0 || textsGenerated > 0) {
    await consumeAiQuota({
      organizationId: row.org.id,
      userId: quotaUserId,
      scope,
      images: imagesGenerated,
      texts: textsGenerated,
    });
  }

  const after = await readAiQuota({
    organizationId: row.org.id,
    userId: quotaUserId,
    scope,
    plan: row.org.plan,
  });
  result.quota = {
    imagesRemaining: after.remaining.images,
    textsRemaining: after.remaining.texts,
  };

  await logAudit({
    organizationId: row.org.id,
    actorUserId: session.user.id,
    action: "ai.generate_branding",
    payload: {
      promptChars: prompt.length,
      wantLogo,
      wantPalette,
      wantBackground,
      generatedLogo: Boolean(result.logoUrl),
      generatedPalette: Boolean(result.palette),
      generatedBackground: Boolean(result.cardBackgroundUrl),
    },
  });

  return NextResponse.json(result);
}

function buildLogoPrompt(input: { prompt: string; palette: BrandingResult | undefined }): string {
  const parts = [
    "Logo profesional minimalista para una empresa.",
    "Iconografía simple, marca limpia, plano (sin sombras realistas), centrado, fondo blanco sólido, ratio cuadrado.",
    "No incluyas texto, ni siglas, ni letras. Solo el símbolo gráfico.",
  ];
  if (input.palette) {
    parts.push(
      `Paleta de la marca: primario ${input.palette.primaryColor}, secundario ${input.palette.secondaryColor}.`,
    );
  }
  parts.push(`Contexto de la empresa: ${input.prompt}`);
  return parts.join(" ");
}

function buildBackgroundPrompt(input: {
  prompt: string;
  palette: BrandingResult | undefined;
}): string {
  const parts = [
    "Fondo abstracto y profesional para tarjeta de presentación digital, formato vertical (retrato), pensado para cubrir toda la tarjeta.",
    "Composición con espacio negativo en la parte central inferior (donde irán nombre, cargo y datos de contacto sobre fondo claro).",
    "Estética corporativa moderna, formas geométricas suaves, texturas sutiles o degradados elegantes.",
    "Sin texto, sin caras, sin logos, sin marcas de agua, sin tipografía visible.",
  ];
  if (input.palette) {
    parts.push(
      `Usá la paleta de marca: primario ${input.palette.primaryColor}, secundario ${input.palette.secondaryColor}.`,
    );
  }
  parts.push(`Contexto de la empresa: ${input.prompt}`);
  return parts.join(" ");
}
