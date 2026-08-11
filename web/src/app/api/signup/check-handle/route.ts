import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateHandle } from "@/lib/handles";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("handle") ?? "").toLowerCase().trim();
  const err = validateHandle(raw);
  if (err) return NextResponse.json({ ok: false, error: err });

  const taken = await prisma.organization.findUnique({
    where: { slug: raw },
    select: { id: true },
  });
  return NextResponse.json({ ok: !taken, available: !taken });
}
