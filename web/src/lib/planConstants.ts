/**
 * Constantes y helpers puros relacionados con precios y planes. Sin imports de
 * Prisma ni Next, así pueden usarse desde componentes cliente y server.
 */

export const PRICES_ARS_CENTS = {
  particularPro: 1_599_00,
  empleadoExtra: 1_099_00,
  empresaPerSeat: 3_999_00,
} as const;

export const ANNUAL_TRANSFER_DISCOUNT = 0.1;

/** Precio mensual con descuento 10% anual aplicado y multiplicado por 12. */
export function priceAnnualTransferCents(monthlyCents: number): number {
  return Math.round(monthlyCents * 12 * (1 - ANNUAL_TRANSFER_DISCOUNT));
}

/** Mínimo de asientos para empresa: <10 libres, ≥10 obligatorios. */
export const EMPRESA_MIN_SEATS_AT_PACK = 10;
