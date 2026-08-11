import { NextResponse } from "next/server";
import { MembershipStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getMembershipForUser } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import {
  generateCardText,
  generateImageBase64,
  type CardTextResult,
} from "@/lib/openai";
import { fileToDataUrl, saveAiImage } from "@/lib/aiStorage";
import { sniffImageMime, UPLOAD_MAX_BYTES } from "@/lib/uploads";
import {
  aiCardScopeFor,
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

type GenerateCardResponse = {
  text?: CardTextResult;
  photoUrl?: string;
  cardBackgroundUrl?: string;
  warnings: string[];
  /** Cupo restante después de esta generación. */
  quota?: {
    imagesRemaining: number;
    textsRemaining: number;
  };
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("No autenticado", 401);

  const rl = checkRateLimit(`ai-card:${session.user.id}`, 10, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Cuerpo inválido (esperaba multipart/form-data)", 400);
  }

  const orgSlug = String(form.get("orgSlug") ?? "").trim();
  if (!orgSlug) return jsonError("Falta orgSlug", 400);

  const row = await getMembershipForUser(orgSlug, session.user.id);
  if (!row || row.membership.status !== MembershipStatus.active) {
    return jsonError("Sin acceso a la organización", 403);
  }

  const features = getPlanFeatures(row.org);
  if (!features.aiEnabled) {
    return jsonError(
      "Tu plan actual no incluye IA. Mejorá a Pro o Empresa para usar esta función.",
      402,
    );
  }

  const wantText = form.get("wantText") !== "false";
  const wantPhoto = form.get("wantPhoto") === "true";
  const wantBackground = form.get("wantBackground") === "true";

  const prompt = String(form.get("prompt") ?? "").trim();
  const fileInput = form.get("image");
  const file = fileInput instanceof File && fileInput.size > 0 ? fileInput : null;

  if (!prompt && !file) {
    return jsonError("Indicá al menos un prompt o subí una imagen de referencia", 400);
  }
  if (!wantText && !wantPhoto && !wantBackground) {
    return jsonError("Elegí al menos una salida a generar", 400);
  }

  const scope = aiCardScopeFor(row.org);
  const quotaUserId = aiQuotaUserIdFor({
    org: row.org,
    scope,
    actorUserId: session.user.id,
  });
  const imagesNeeded = (wantPhoto ? 1 : 0) + (wantBackground ? 1 : 0);
  const textsNeeded = wantText ? 1 : 0;
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

  let imageDataUrl: string | undefined;
  if (file) {
    if (file.size > UPLOAD_MAX_BYTES) {
      return jsonError("La imagen supera el máximo de 2 MB", 400);
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    if (!sniffImageMime(buf)) {
      return jsonError("Imagen con formato no permitido (usa JPG, PNG, WebP o GIF)", 400);
    }
    imageDataUrl = await fileToDataUrl(file);
  }

  const result: GenerateCardResponse = { warnings: [] };

  let textResult: CardTextResult | undefined;
  if (wantText) {
    try {
      textResult = await generateCardText({ prompt, imageDataUrl });
      result.text = textResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido al generar texto";
      return jsonError(`Generación de texto falló: ${msg}`, 502);
    }
  }

  if (wantPhoto) {
    try {
      const photoPrompt = buildPhotoPrompt({
        textPrompt: prompt,
        text: textResult,
      });
      const b64 = await generateImageBase64({
        prompt: photoPrompt,
        size: "1024x1024",
        quality: "medium",
      });
      result.photoUrl = await saveAiImage({
        orgSlug,
        subfolder: "photos",
        base64: b64,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      result.warnings.push(`No se pudo generar la foto: ${msg}`);
    }
  }

  if (wantBackground) {
    try {
      const bgPrompt = buildBackgroundPrompt({ textPrompt: prompt, text: textResult });
      const b64 = await generateImageBase64({
        prompt: bgPrompt,
        size: "1536x1024",
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

  const imagesGenerated = (result.photoUrl ? 1 : 0) + (result.cardBackgroundUrl ? 1 : 0);
  const textsGenerated = result.text ? 1 : 0;
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
    action: "ai.generate_card",
    payload: {
      hasImage: Boolean(file),
      hasPrompt: Boolean(prompt),
      wantText,
      wantPhoto,
      wantBackground,
      generatedPhoto: Boolean(result.photoUrl),
      generatedBackground: Boolean(result.cardBackgroundUrl),
    },
  });

  return NextResponse.json(result);
}

function buildPhotoPrompt(input: {
  textPrompt: string;
  text: CardTextResult | undefined;
}): string {
  const parts = [
    "Foto de retrato profesional para una tarjeta de presentación digital.",
    "Estilo corporate, iluminación suave de estudio, fondo neutro desenfocado, encuadre busto, mirada a cámara, expresión amable.",
    "Realista, alta calidad, sin texto, sin marcas de agua, sin logos.",
  ];
  if (input.text?.title) parts.push(`Cargo: ${input.text.title}.`);
  if (input.text?.displayName) parts.push(`Nombre: ${input.text.displayName}.`);
  if (input.textPrompt) parts.push(`Contexto adicional: ${input.textPrompt}`);
  return parts.join(" ");
}

function buildBackgroundPrompt(input: {
  textPrompt: string;
  text: CardTextResult | undefined;
}): string {
  const parts = [
    "Imagen de fondo abstracta y profesional para tarjeta de presentación digital.",
    "Composición horizontal con espacio negativo arriba y a los lados (la zona central puede llevar un degradado para legibilidad de texto encima).",
    "Estética corporativa moderna, formas geométricas suaves o degradados sutiles. Sin texto, sin caras, sin logos, sin marcas de agua.",
  ];
  if (input.text?.title) parts.push(`Industria/rol implícito: ${input.text.title}.`);
  if (input.textPrompt) parts.push(`Contexto: ${input.textPrompt}`);
  return parts.join(" ");
}
