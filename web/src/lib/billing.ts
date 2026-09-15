/**
 * Stub de billing con Mercado Pago. Las credenciales reales no están todavía: este
 * módulo concentra el cálculo de precios, las helpers para crear preferencias / preapprovals
 * y los handlers de webhook. Sin `MP_ACCESS_TOKEN` los endpoints siguen funcionando en modo
 * "manual": el admin paga por transferencia y un humano marca como `active` desde la admin.
 */

import { createHmac, timingSafeEqual } from "crypto";
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

    const result = await preApproval.create({
      body: {
        reason: input.description,
        // Usamos el id de la org como external_reference para que el webhook
        // pueda ubicar la organización aunque cambie el id de la suscripción.
        external_reference: input.orgId,
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

    // Guardamos el id real de la suscripción (preapproval) para poder
    // actualizarla o cancelarla luego y para el matching del webhook.
    const externalRef = result.id ?? `mp_${input.orgId}_${Date.now()}`;
    return { ok: true, checkoutUrl: result.init_point, externalRef };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de MercadoPago" };
  }
}

/**
 * Actualiza el monto de una suscripción recurrente existente (por ejemplo, al
 * cambiar la cantidad de asientos de una empresa). No hace nada si no hay token
 * o si el id no corresponde a una suscripción real de MercadoPago (modo manual).
 */
export async function updateMpSubscriptionAmount(input: {
  subscriptionId: string;
  amountCents: number;
}): Promise<void> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token || !isRealMpId(input.subscriptionId)) return;

  const { MercadoPagoConfig, PreApproval } = await import("mercadopago");
  const client = new MercadoPagoConfig({ accessToken: token });
  const preApproval = new PreApproval(client);

  await preApproval.update({
    id: input.subscriptionId,
    body: {
      auto_recurring: {
        transaction_amount: input.amountCents / 100,
        currency_id: "ARS",
      },
    },
  });
}

/**
 * Cancela una suscripción recurrente. No-op si no hay token o si el id es de
 * modo manual (transferencia / sin credenciales).
 */
export async function cancelMpSubscription(subscriptionId: string): Promise<void> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token || !isRealMpId(subscriptionId)) return;

  const { MercadoPagoConfig, PreApproval } = await import("mercadopago");
  const client = new MercadoPagoConfig({ accessToken: token });
  const preApproval = new PreApproval(client);

  await preApproval.update({
    id: subscriptionId,
    body: { status: "cancelled" },
  });
}

/* -------------------------------------------------------------------------- */
/*  Lectura de recursos (para el webhook)                                     */
/* -------------------------------------------------------------------------- */

export interface MpSubscription {
  id: string;
  status: "authorized" | "paused" | "cancelled" | "pending" | string;
  externalReference?: string;
  nextPaymentDate?: string;
}

export interface MpPayment {
  id: string;
  status: "approved" | "rejected" | "pending" | string;
  subscriptionId?: string;
  externalReference?: string;
  amount: number;
  currency?: string;
  dateApproved?: string;
}

/** Trae los datos de una suscripción (preapproval) por su id. */
export async function fetchMpSubscription(id: string): Promise<MpSubscription> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN no configurado.");

  const { MercadoPagoConfig, PreApproval } = await import("mercadopago");
  const client = new MercadoPagoConfig({ accessToken: token });
  const data = await new PreApproval(client).get({ id });

  return {
    id: String(data.id ?? id),
    status: (data.status ?? "pending") as MpSubscription["status"],
    externalReference: data.external_reference,
    nextPaymentDate: data.next_payment_date,
  };
}

/** Trae los datos de un pago por su id. */
export async function fetchMpPayment(id: string): Promise<MpPayment> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN no configurado.");

  const { MercadoPagoConfig, Payment } = await import("mercadopago");
  const client = new MercadoPagoConfig({ accessToken: token });
  const data = await new Payment(client).get({ id });

  return {
    id: String(data.id ?? id),
    status: data.status ?? "pending",
    subscriptionId: (data as { preapproval_id?: string }).preapproval_id,
    externalReference: data.external_reference ?? undefined,
    amount: data.transaction_amount ?? 0,
    currency: data.currency_id,
    dateApproved: data.date_approved ?? undefined,
  };
}

/* -------------------------------------------------------------------------- */
/*  Verificación de firma del webhook                                         */
/* -------------------------------------------------------------------------- */

/** Tolerancia de antigüedad del timestamp de la firma (5 minutos). */
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

/** Un id "real" de MercadoPago no lleva los prefijos internos de modo manual. */
function isRealMpId(id: string): boolean {
  return !/^(manual_|transfer_|mp_)/.test(id);
}

/**
 * Verifica la firma HMAC-SHA256 que Mercado Pago incluye en el header
 * `x-signature` de sus notificaciones, según:
 * https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 *
 * El manifest se arma como `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * usando `data.id` de los query params de la URL (en minúsculas si viene en
 * mayúsculas) y `x-request-id` del header. Las partes ausentes se omiten.
 */
export function verifyMpSignature(req: Request): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // Sin secret configurado sólo aceptamos en desarrollo local.
    return process.env.NODE_ENV === "development";
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature) return false;

  // El header viene como "ts=<millis>,v1=<hmac-hex>".
  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of xSignature.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "ts") ts = value;
    else if (key === "v1") v1 = value;
  }
  if (!ts || !v1) return false;

  // `data.id` proviene del query param de la URL de notificación.
  let dataId: string | null = null;
  try {
    const paramsUrl = new URL(req.url).searchParams;
    dataId = paramsUrl.get("data.id") ?? paramsUrl.get("id");
  } catch {
    dataId = null;
  }
  if (dataId && /[A-Z]/.test(dataId)) dataId = dataId.toLowerCase();

  // Se omiten las partes ausentes del manifest (no se dejan vacías).
  let manifest = "";
  if (dataId) manifest += `id:${dataId};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  // Comparación en tiempo constante para no filtrar información por timing.
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(v1, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  if (!timingSafeEqual(expectedBuf, providedBuf)) return false;

  // Rechaza notificaciones viejas para mitigar replays. El ts puede venir en
  // segundos o milisegundos según la integración; normalizamos a milisegundos.
  let tsMs = Number(ts);
  if (Number.isFinite(tsMs)) {
    if (tsMs < 1e12) tsMs *= 1000;
    if (Math.abs(Date.now() - tsMs) > SIGNATURE_MAX_AGE_MS) return false;
  }

  return true;
}
