import { NextResponse } from "next/server";
import { BillingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Stub de webhook de Mercado Pago.
 *
 * En producción Mercado Pago va a llamar acá con `topic=payment` o
 * `topic=preapproval`. Hoy aceptamos un payload JSON simple para uso local:
 *
 *   { externalRef: "manual_xxx", status: "approved" | "rejected" | "pending" }
 *
 * y actualizamos la org y la factura asociada. Esto permite "confirmar" pagos
 * manuales con un curl mientras Mercado Pago no esté integrado de verdad.
 */
export async function POST(req: Request) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const obj = body as { externalRef?: string; status?: string };
  const ref = String(obj.externalRef ?? "").trim();
  const status = String(obj.status ?? "").trim();
  if (!ref) return NextResponse.json({ ok: false, error: "externalRef requerido" }, { status: 400 });

  const invoice = await prisma.billingInvoice.findFirst({ where: { externalRef: ref } });
  if (!invoice) {
    return NextResponse.json({ ok: false, error: "Factura no encontrada" }, { status: 404 });
  }

  if (status === "approved") {
    await prisma.$transaction([
      prisma.billingInvoice.update({
        where: { id: invoice.id },
        data: { paidAt: new Date() },
      }),
      prisma.organization.update({
        where: { id: invoice.organizationId },
        data: { billingStatus: BillingStatus.active, inTrial: false },
      }),
    ]);
    return NextResponse.json({ ok: true, status: "active" });
  }
  if (status === "rejected") {
    await prisma.organization.update({
      where: { id: invoice.organizationId },
      data: { billingStatus: BillingStatus.past_due },
    });
    return NextResponse.json({ ok: true, status: "past_due" });
  }
  return NextResponse.json({ ok: true, status: "pending" });
}

export function GET() {
  return NextResponse.json({
    ok: true,
    note: "Endpoint de webhook MP (stub). Usá POST con { externalRef, status }.",
  });
}
