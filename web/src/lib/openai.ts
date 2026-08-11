import OpenAI from "openai";
import { z } from "zod";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta OPENAI_API_KEY en el entorno. Pegala en .env y reiniciá el dev server.",
    );
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

export const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

const cardTextSchema = z.object({
  displayName: z.string().min(1).max(120),
  title: z.string().max(120).default(""),
  bio: z.string().max(600).default(""),
  phone: z.string().max(40).default(""),
  emailPublic: z.string().max(120).default(""),
});

export type CardTextResult = z.infer<typeof cardTextSchema>;

const CARD_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    displayName: { type: "string", description: "Nombre completo de la persona" },
    title: { type: "string", description: "Cargo / puesto. Cadena vacía si se desconoce." },
    bio: {
      type: "string",
      description:
        "Bio breve, profesional, en español neutro, 1-3 oraciones (máx. 400 caracteres). Cadena vacía si no hay info.",
    },
    phone: {
      type: "string",
      description: "Teléfono en formato internacional, o cadena vacía si no hay.",
    },
    emailPublic: {
      type: "string",
      description: "Email de contacto profesional, o cadena vacía si no hay.",
    },
  },
  required: ["displayName", "title", "bio", "phone", "emailPublic"],
} as const;

type GenerateCardTextInput = {
  /** Texto libre con descripción de la persona/empresa/rol. Opcional si hay imagen. */
  prompt?: string;
  /** Imagen como data URL (base64) — foto de tarjeta física para OCR, o foto de la persona. */
  imageDataUrl?: string;
  /** Pista del idioma de salida (por defecto "es"). */
  locale?: string;
};

export async function generateCardText(
  input: GenerateCardTextInput,
): Promise<CardTextResult> {
  const client = getOpenAI();
  const locale = input.locale || "es";

  const userParts: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [];

  const promptParts: string[] = [];
  promptParts.push(
    `Idioma de salida: ${locale}. Sos un asistente que arma tarjetas de presentación profesionales.`,
  );
  if (input.imageDataUrl) {
    promptParts.push(
      "Te paso una imagen. Si es la foto de una tarjeta de presentación física, extraé los datos (nombre, cargo, teléfono, email) tal cual aparecen y redactá una bio breve coherente con el rol/empresa que figura en la tarjeta. Si es una foto de una persona/contexto sin texto, inferí lo razonable a partir del prompt.",
    );
  }
  if (input.prompt) {
    promptParts.push(`Información adicional del usuario: ${input.prompt}`);
  }
  promptParts.push(
    "Devolvé únicamente el JSON pedido. Si un campo no se conoce, devolvé cadena vacía. La bio debe sonar natural, en primera persona del singular, sin emojis, máximo 3 oraciones.",
  );

  userParts.push({ type: "text", text: promptParts.join("\n\n") });
  if (input.imageDataUrl) {
    userParts.push({ type: "image_url", image_url: { url: input.imageDataUrl } });
  }

  const completion = await client.chat.completions.create({
    model: TEXT_MODEL,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "business_card",
        strict: true,
        schema: CARD_JSON_SCHEMA,
      },
    },
    messages: [
      {
        role: "system",
        content:
          "Generás tarjetas de presentación profesionales. Sos breve, claro y nunca inventás datos verificables (teléfonos, emails) — si no están, devolvés cadena vacía.",
      },
      { role: "user", content: userParts },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as unknown;
  return cardTextSchema.parse(parsed);
}

const brandingSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/u, "primaryColor debe ser hex #RRGGBB")
    .transform((s) => s.toLowerCase()),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/u, "secondaryColor debe ser hex #RRGGBB")
    .transform((s) => s.toLowerCase()),
  rationale: z.string().max(280).default(""),
});

export type BrandingResult = z.infer<typeof brandingSchema>;

const BRANDING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    primaryColor: {
      type: "string",
      description:
        "Color primario en formato hex #RRGGBB (6 dígitos). Adecuado para texto sobre fondo claro.",
    },
    secondaryColor: {
      type: "string",
      description: "Color secundario complementario en formato hex #RRGGBB (6 dígitos).",
    },
    rationale: {
      type: "string",
      description: "Una frase breve (máx. 200 chars) explicando la elección.",
    },
  },
  required: ["primaryColor", "secondaryColor", "rationale"],
} as const;

export async function generateBrandingPalette(prompt: string): Promise<BrandingResult> {
  const client = getOpenAI();

  const completion = await client.chat.completions.create({
    model: TEXT_MODEL,
    response_format: {
      type: "json_schema",
      json_schema: { name: "branding_palette", strict: true, schema: BRANDING_JSON_SCHEMA },
    },
    messages: [
      {
        role: "system",
        content:
          "Sos un asistente de branding. Devolvés paletas de 2 colores (primario y secundario) en hex #RRGGBB, profesionales y con buen contraste para tarjetas digitales. Nunca devuelvas blanco puro ni negro puro.",
      },
      {
        role: "user",
        content: `Necesito la paleta para esta empresa: ${prompt}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as unknown;
  return brandingSchema.parse(parsed);
}

type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";

type GenerateImageInput = {
  prompt: string;
  size?: ImageSize;
  /** "low" | "medium" | "high" — afecta costo y calidad. Default: "medium". */
  quality?: "low" | "medium" | "high";
};

export async function generateImageBase64(input: GenerateImageInput): Promise<string> {
  const client = getOpenAI();
  const result = await client.images.generate({
    model: IMAGE_MODEL,
    prompt: input.prompt,
    size: input.size ?? "1024x1024",
    quality: input.quality ?? "medium",
    n: 1,
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI no devolvió imagen (b64_json vacío)");
  return b64;
}
