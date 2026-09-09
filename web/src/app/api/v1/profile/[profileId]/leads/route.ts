import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const LeadSchema = z.object({
  name:      z.string().min(2, "El nombre es obligatorio"),
  email:     z.string().email("Email inválido").optional().or(z.literal("")),
  phone:     z.string().optional(),
  company:   z.string().optional(),
  note:      z.string().max(500).optional(),
  wantsCard: z.boolean().optional().default(false),
});

/**
 * POST /api/v1/profile/:profileId/leads
 * Ruta pública — el visitante deja sus datos desde la tarjeta.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params;

  // Verificar que el perfil existe y está activo
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, status: true },
  });
  if (!profile) return jsonError("Perfil no encontrado", 404);
  if (profile.status !== "active") return jsonError("Perfil inactivo", 403);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("JSON inválido", 400);

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Datos inválidos";
    return jsonError(message, 422);
  }

  const { name, email, phone, company, note, wantsCard } = parsed.data;

  const lead = await prisma.lead.create({
    data: {
      profileId,
      name,
      email:     email     || null,
      phone:     phone     || null,
      company:   company   || null,
      note:      note      || null,
      wantsCard: wantsCard ?? false,
    },
  });

  // TODO: si wantsCard === true → encolar tarea para enviar vCard al email del visitante

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}
