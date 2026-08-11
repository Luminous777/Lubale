import { NextResponse } from "next/server";
import { MembershipStatus, BillingPlan, BillingCycle, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBearerUser } from "@/lib/httpAuth";
import { createMpSubscription, quoteFor } from "@/lib/billing";

export async function POST(req: Request) {
  const user = await getBearerUser(req);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: MembershipStatus.active },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return NextResponse.json({ error: "Sin organización" }, { status: 404 });

  const org = membership.organization;

  const quote = quoteFor({
    plan: BillingPlan.pro,
    kind: org.kind,
    seats: 1,
    cycle: BillingCycle.monthly,
    paymentMethod: PaymentMethod.card,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  const result = await createMpSubscription({
    orgId: org.id,
    amountCents: quote.amountCents,
    cycle: BillingCycle.monthly,
    description: `Plan Pro - Mi Tarjeta Digital`,
    payerEmail: user.email,
    successPath: `/dashboard/${org.slug}/billing`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ checkoutUrl: result.checkoutUrl, externalRef: result.externalRef });
}
