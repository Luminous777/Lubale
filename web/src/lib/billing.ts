/**
 * Stub de billing con Mercado Pago. Las credenciales reales no están todavía: este
 * módulo concentra el cálculo de precios, las helpers para crear preferencias / preapprovals
 * y los handlers de webhook. Sin `MP_ACCESS_TOKEN` los endpoints siguen funcionando en modo
 * "manual": el admin paga por transferencia y un humano marca como `active` desde la admin.
 */

import {
  BillingCycle,
  BillingPlan,
  BillingStatus,
  OrganizationKind,
  PaymentMethod,
} from "@prisma/client";
import {
  ANNUAL_TRANSFER_DISCOUNT,
  EMPRESA_MIN_SEATS_AT_PACK,
  PRICES_ARS_CENTS,
  priceAnnualTransferCents,
} from "@/lib/plan";

export type Quote = {
  /** Total a cobrar (en centavos ARS). */
  amountCents: number;
  currency: "ARS";
  cycle: BillingCycle;
  paymentMethod: PaymentMethod;
  description: string;
  detail: string[];
};

/** Calcula precio para una org en función del plan, asientos, ciclo y método. */
export function quoteFor(input: {
  plan: BillingPlan;
  kind: OrganizationKind;
  seats: number;
  cycle: BillingCycle;
  paymentMethod: PaymentMethod;
  /** Si true, aplicamos la tarifa "empleado extra" en personal. */
  isEmployeeExtra?: boolean;
}): Quote {
  if (input.plan === BillingPlan.free) {
    return {
      amountCents: 0,
      currency: "ARS",
      cycle: input.cycle,
      paymentMethod: input.paymentMethod,
      description: "Plan Gratis",
      detail: ["Sin cargo. 1 enlace de WhatsApp, sin IA."],
    };
  }

  const isPersonal = input.kind === OrganizationKind.personal;
  if (isPersonal) {
    const monthlyPerSeat = input.isEmployeeExtra
      ? PRICES_ARS_CENTS.empleadoExtra
      : PRICES_ARS_CENTS.particularPro;

    if (input.cycle === BillingCycle.monthly) {
      // Personal y empleado extra: solo tarjeta para mensual.
      return {
        amountCents: monthlyPerSeat,
        currency: "ARS",
        cycle: BillingCycle.monthly,
        paymentMethod: PaymentMethod.card,
        description: input.isEmployeeExtra
          ? "Empleado extra (mensual)"
          : "Particular Pro (mensual)",
        detail: [
          `${formatCents(monthlyPerSeat)} / mes con tarjeta`,
          "Mejorá a anual con transferencia para 10% off.",
        ],
      };
    }
    // Anual con transferencia
    if (input.paymentMethod === PaymentMethod.transfer) {
      const annual = priceAnnualTransferCents(monthlyPerSeat);
      return {
        amountCents: annual,
        currency: "ARS",
        cycle: BillingCycle.annual,
        paymentMethod: PaymentMethod.transfer,
        description: input.isEmployeeExtra
          ? "Empleado extra (anual + transferencia)"
          : "Particular Pro (anual + transferencia)",
        detail: [
          `${formatCents(annual)} / año (10% off vs mensual)`,
          "Pagás por transferencia y te activamos el plan al confirmar.",
        ],
      };
    }
    // Anual con tarjeta no se ofrece en personal: forzamos mensual con tarjeta.
    const annualOnCard = monthlyPerSeat * 12;
    return {
      amountCents: annualOnCard,
      currency: "ARS",
      cycle: BillingCycle.annual,
      paymentMethod: PaymentMethod.card,
      description: input.isEmployeeExtra
        ? "Empleado extra (anual con tarjeta)"
        : "Particular Pro (anual con tarjeta)",
      detail: [
        `${formatCents(annualOnCard)} / año con tarjeta`,
        "Tip: con transferencia anual ahorrás un 10%.",
      ],
    };
  }

  // Empresa
  const seats = Math.max(1, input.seats);
  const seatsBilled =
    seats >= EMPRESA_MIN_SEATS_AT_PACK ? seats : seats; // hoy no impone mínimo extra abajo de 10
  const monthlyTotal = seatsBilled * PRICES_ARS_CENTS.empresaPerSeat;
  if (input.cycle === BillingCycle.monthly) {
    return {
      amountCents: monthlyTotal,
      currency: "ARS",
      cycle: BillingCycle.monthly,
      paymentMethod: input.paymentMethod,
      description: `Empresa (${seatsBilled} asientos · mensual)`,
      detail: [
        `${formatCents(PRICES_ARS_CENTS.empresaPerSeat)} × ${seatsBilled} = ${formatCents(monthlyTotal)} / mes`,
        "Cobramos cada mes el día 1°.",
      ],
    };
  }
  // Anual
  if (input.paymentMethod === PaymentMethod.transfer) {
    const annual = priceAnnualTransferCents(monthlyTotal);
    return {
      amountCents: annual,
      currency: "ARS",
      cycle: BillingCycle.annual,
      paymentMethod: PaymentMethod.transfer,
      description: `Empresa (${seatsBilled} asientos · anual + transferencia)`,
      detail: [
        `${formatCents(annual)} / año (${(ANNUAL_TRANSFER_DISCOUNT * 100).toFixed(0)}% off)`,
        "Te enviamos los datos para transferencia tras confirmar.",
      ],
    };
  }
  // Anual con tarjeta — sin descuento
  const annualOnCard = monthlyTotal * 12;
  return {
    amountCents: annualOnCard,
    currency: "ARS",
    cycle: BillingCycle.annual,
    paymentMethod: PaymentMethod.card,
    description: `Empresa (${seatsBilled} asientos · anual con tarjeta)`,
    detail: [
      `${formatCents(annualOnCard)} / año con tarjeta`,
      "Con transferencia anual ahorrás un 10%.",
    ],
  };
}

export function formatCents(cents: number): string {
  const ars = cents / 100;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(ars);
}

export function billingStatusLabel(status: BillingStatus): string {
  switch (status) {
    case BillingStatus.active:
      return "Activo";
    case BillingStatus.trialing:
      return "Período de prueba";
    case BillingStatus.past_due:
      return "Pago vencido";
    case BillingStatus.canceled:
      return "Cancelado";
    default:
      return "Sin pago";
  }
}

/* -------------------------------------------------------------------------- */
/*  Mercado Pago                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Crea una suscripción recurrente en MP (preapproval).
 * Sin MP_ACCESS_TOKEN cae en modo manual: el admin confirma la transferencia.
 */
export async function createMpSubscription(input: {
  orgId: string;
  amountCents: number;
  cycle: BillingCycle;
  description: string;
  payerEmail: string;
  successPath: string;
}): Promise<{ ok: true; checkoutUrl: string; externalRef: string } | { ok: false; error: string }> {
  const token = process.env.MP_ACCESS_TOKEN;

  if (!token) {
    const externalRef = `manual_${input.orgId}_${Date.now()}`;
    return {
      ok: true,
      checkoutUrl: `${input.successPath}?status=pending&ref=${externalRef}`,
      externalRef,
    };
  }

  try {
    const { MercadoPagoConfig, PreApproval } = await import("mercadopago");
    const client = new MercadoPagoConfig({ accessToken: token });
    const preApproval = new PreApproval(client);

    const frequencyType = input.cycle === BillingCycle.annual ? "months" : "months";
    const frequency = input.cycle === BillingCycle.annual ? 12 : 1;
    const amountARS = input.amountCents / 100;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const externalRef = `mp_${input.orgId}_${Date.now()}`;

    const result = await preApproval.create({
      body: {
        reason: input.description,
        external_reference: externalRef,
        payer_email: input.payerEmail,
        auto_recurring: {
          frequency,
          frequency_type: frequencyType,
          transaction_amount: amountARS,
          currency_id: "ARS",
        },
        back_url: `${appUrl}${input.successPath}`,
        status: "pending",
      },
    });

    if (!result.init_point) {
      return { ok: false, error: "MercadoPago no devolvió URL de pago." };
    }

    return { ok: true, checkoutUrl: result.init_point, externalRef };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de MercadoPago" };
  }
}

/**
 * Crea una preferencia de pago único (para planes anuales con tarjeta).
 */
export async function createMpPreference(input: {
  orgId: string;
  amountCents: number;
  description: string;
  payerEmail: string;
  successPath: string;
  failurePath: string;
}): Promise<{ ok: true; checkoutUrl: string; externalRef: string } | { ok: false; error: string }> {
  const token = process.env.MP_ACCESS_TOKEN;

  if (!token) {
    const externalRef = `manual_${input.orgId}_${Date.now()}`;
    return {
      ok: true,
      checkoutUrl: `${input.successPath}?status=pending&ref=${externalRef}`,
      externalRef,
    };
  }

  try {
    const { Preference, MercadoPagoConfig } = await import("mercadopago");
    const client = new MercadoPagoConfig({ accessToken: token });
    const preference = new Preference(client);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const externalRef = `mp_once_${input.orgId}_${Date.now()}`;

    const result = await preference.create({
      body: {
        items: [{
          id: externalRef,
          title: input.description,
          quantity: 1,
          unit_price: input.amountCents / 100,
          currency_id: "ARS",
        }],
        payer: { email: input.payerEmail },
        external_reference: externalRef,
        back_urls: {
          success: `${appUrl}${input.successPath}?status=approved`,
          failure: `${appUrl}${input.failurePath}?status=failed`,
          pending: `${appUrl}${input.successPath}?status=pending`,
        },
        auto_return: "approved",
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
      },
    });

    if (!result.init_point) {
      return { ok: false, error: "MercadoPago no devolvió URL de pago." };
    }

    return { ok: true, checkoutUrl: result.init_point, externalRef };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de MercadoPago" };
  }
}
