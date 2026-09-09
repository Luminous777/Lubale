/**
 * @/lib/mercadopago — stub de integración con Mercado Pago
 *
 * TODO: implementar con el SDK oficial de Mercado Pago o la API REST.
 * Documentación: https://www.mercadopago.com.ar/developers/es/reference
 *
 * Variables de entorno necesarias:
 *   MP_ACCESS_TOKEN   — Access Token del vendedor (producción o sandbox)
 *   MP_WEBHOOK_SECRET — Secret para verificar firma de webhooks
 */

const BASE = 'https://api.mercadopago.com';

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN ?? ''}`,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tipos de retorno
// ──────────────────────────────────────────────────────────────────────────────

export interface MpSubscription {
  id: string;
  status: 'authorized' | 'paused' | 'cancelled' | 'pending';
  /** Plan inferido desde el external_reference o metadata */
  plan?: string;
  externalReference?: string;
  nextPaymentDate?: string;
}

export interface MpPayment {
  id: string;
  status: 'approved' | 'rejected' | 'pending' | string;
  subscriptionId?: string;
  amount: number;
  currency?: string;
  dateApproved?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface MpPreference {
  initPoint: string;
  id: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Verificación de firma de webhook
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Verifica la firma HMAC-SHA256 que Mercado Pago incluye en el header
 * `x-signature` de sus notificaciones.
 *
 * TODO: implementar según:
 * https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
export function verifyMpSignature(headers: Headers, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // En desarrollo sin secret configurado, aceptamos todo
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  }

  // TODO: extraer ts y v1 del header x-signature, construir el manifest string
  // "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" y comparar con HMAC-SHA256.
  // Por ahora stub que acepta todo en dev:
  return process.env.NODE_ENV === 'development';
}

// ──────────────────────────────────────────────────────────────────────────────
// Suscripciones (preapproval)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Crea una preferencia de suscripción (preapproval) en MP y retorna la URL
 * de pago (`initPoint`) para redirigir al usuario.
 */
export async function createSubscriptionPreference({
  orgId,
  plan,
  seats,
  amount,
  payerEmail,
  backUrl,
}: {
  orgId: string;
  plan: string;
  seats: number;
  amount: number;
  payerEmail: string;
  backUrl: string;
}): Promise<MpPreference> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[mercadopago] createSubscriptionPreference stub', { orgId, plan, seats, amount });
    // En dev devuelve una URL ficticia para no romper el flujo
    return { id: 'stub-pref-id', initPoint: `${backUrl}&stub=1` };
  }

  // TODO: llamar a POST /preapproval con:
  // reason, auto_recurring.frequency/unit/transaction_amount/currency_id,
  // payer_email, back_url, external_reference (orgId), metadata.plan/seats
  throw new Error('MP_ACCESS_TOKEN no configurado para producción.');
}

/**
 * Actualiza el monto de una suscripción existente (para cambio de asientos).
 */
export async function updateSubscriptionSeats({
  subscriptionId,
  amount,
}: {
  subscriptionId: string;
  amount: number;
}): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[mercadopago] updateSubscriptionSeats stub', { subscriptionId, amount });
    return;
  }

  // TODO: PATCH /preapproval/:id con { auto_recurring: { transaction_amount: amount } }
  await fetch(`${BASE}/preapproval/${subscriptionId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ auto_recurring: { transaction_amount: amount } }),
  });
}

/**
 * Cancela una suscripción activa.
 */
export async function cancelMpSubscription(subscriptionId: string): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[mercadopago] cancelMpSubscription stub', { subscriptionId });
    return;
  }

  // TODO: PATCH /preapproval/:id con { status: 'cancelled' }
  await fetch(`${BASE}/preapproval/${subscriptionId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ status: 'cancelled' }),
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Fetch de recursos para webhooks
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Trae los datos de una suscripción (preapproval) por su ID.
 */
export async function fetchMpSubscription(id: string): Promise<MpSubscription> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[mercadopago] fetchMpSubscription stub', { id });
    return { id, status: 'authorized', plan: 'pro', externalReference: '' };
  }

  const res = await fetch(`${BASE}/preapproval/${id}`, { headers: headers() });
  const data = await res.json() as {
    id: string;
    status: string;
    external_reference?: string;
    summarized?: { next_scheduled_date?: string };
    metadata?: { plan?: string };
  };

  return {
    id: data.id,
    status: data.status as MpSubscription['status'],
    plan: data.metadata?.plan,
    externalReference: data.external_reference,
    nextPaymentDate: data.summarized?.next_scheduled_date,
  };
}

/**
 * Trae los datos de un pago por su ID.
 */
export async function fetchMpPayment(id: string): Promise<MpPayment> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[mercadopago] fetchMpPayment stub', { id });
    return {
      id,
      status: 'approved',
      subscriptionId: undefined,
      amount: 0,
      currency: 'ARS',
      dateApproved: new Date().toISOString(),
    };
  }

  const res = await fetch(`${BASE}/v1/payments/${id}`, { headers: headers() });
  const data = await res.json() as {
    id: string;
    status: string;
    preapproval_id?: string;
    transaction_amount: number;
    currency_id?: string;
    date_approved?: string;
    metadata?: { period_start?: string; period_end?: string };
  };

  return {
    id: String(data.id),
    status: data.status,
    subscriptionId: data.preapproval_id,
    amount: data.transaction_amount,
    currency: data.currency_id,
    dateApproved: data.date_approved,
    periodStart: data.metadata?.period_start,
    periodEnd: data.metadata?.period_end,
  };
}
