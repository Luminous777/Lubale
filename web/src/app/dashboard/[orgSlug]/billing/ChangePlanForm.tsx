"use client";

import { useActionState, useMemo, useState } from "react";
import {
  BillingCycle,
  BillingPlan,
  OrganizationKind,
  PaymentMethod,
} from "@prisma/client";
import {
  ANNUAL_TRANSFER_DISCOUNT,
  EMPRESA_MIN_SEATS_AT_PACK,
  PRICES_ARS_CENTS,
  priceAnnualTransferCents,
} from "@/lib/planConstants";
import { changePlanFormAction, type ChangePlanState } from "@/server/billing";

type Props = {
  orgId: string;
  orgSlug: string;
  plan: BillingPlan;
  kind: OrganizationKind;
  seats: number;
  actorEmail: string;
};

function formatARS(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function ChangePlanForm({ orgSlug, plan, kind, seats }: Props) {
  const [state, formAction, pending] = useActionState<ChangePlanState, FormData>(
    changePlanFormAction.bind(null, orgSlug),
    undefined,
  );

  const isPersonal = kind === OrganizationKind.personal;
  const [targetPlan, setTargetPlan] = useState<BillingPlan>(
    plan === BillingPlan.free
      ? isPersonal
        ? BillingPlan.pro
        : BillingPlan.business
      : plan,
  );
  const [cycle, setCycle] = useState<BillingCycle>(BillingCycle.monthly);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.card);
  const [seatsCount, setSeatsCount] = useState<number>(Math.max(1, seats));

  const monthlyPerSeat =
    targetPlan === BillingPlan.business
      ? PRICES_ARS_CENTS.empresaPerSeat
      : PRICES_ARS_CENTS.particularPro;

  const billedSeats =
    targetPlan === BillingPlan.business
      ? Math.max(1, seatsCount)
      : 1;

  const monthlyTotal = monthlyPerSeat * billedSeats;
  const annualTransfer = priceAnnualTransferCents(monthlyTotal);
  const annualCard = monthlyTotal * 12;

  const total = useMemo(() => {
    if (targetPlan === BillingPlan.free) return 0;
    if (cycle === BillingCycle.monthly) return monthlyTotal;
    return method === PaymentMethod.transfer ? annualTransfer : annualCard;
  }, [targetPlan, cycle, method, monthlyTotal, annualTransfer, annualCard]);

  // Personal solo permite anual con transferencia (mensual = tarjeta)
  const cycleDisabledForPersonal =
    isPersonal && cycle === BillingCycle.annual && method === PaymentMethod.card;

  return (
    <section className="app-card flex flex-col gap-4 p-6">
      <h2 className="text-base font-semibold text-heading">Cambiar plan</h2>
      <form action={formAction} className="flex flex-col gap-5">
        {/* Plan */}
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="mb-1 text-sm font-medium text-heading">Plan</legend>
          <PlanOption
            checked={targetPlan === BillingPlan.free}
            onChange={() => setTargetPlan(BillingPlan.free)}
            title="Gratis"
            price="$0"
            tagline="1 enlace de WhatsApp · sin IA"
            value="free"
          />
          {isPersonal ? (
            <PlanOption
              checked={targetPlan === BillingPlan.pro}
              onChange={() => setTargetPlan(BillingPlan.pro)}
              title="Particular Pro"
              price={`${formatARS(PRICES_ARS_CENTS.particularPro)}/mes`}
              tagline="IA · marca · todos los enlaces"
              value="pro"
            />
          ) : (
            <PlanOption
              checked={targetPlan === BillingPlan.business}
              onChange={() => setTargetPlan(BillingPlan.business)}
              title="Empresa"
              price={`${formatARS(PRICES_ARS_CENTS.empresaPerSeat)}/asiento`}
              tagline="N tarjetas · marca compartida · IA"
              value="business"
            />
          )}
        </fieldset>
        <input type="hidden" name="plan" value={targetPlan} />

        {/* Asientos (solo empresa) */}
        {targetPlan === BillingPlan.business ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="seats" className="text-sm font-medium text-heading">
              Asientos (tarjetas de empleados)
            </label>
            <input
              id="seats"
              name="seats"
              type="number"
              min={1}
              max={500}
              step={1}
              value={seatsCount}
              onChange={(e) => setSeatsCount(Math.max(1, Number(e.target.value) || 1))}
              className="w-32 rounded-md border border-black/10 bg-white px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted">
              Hasta {EMPRESA_MIN_SEATS_AT_PACK - 1} asientos cobramos por unidad. Desde{" "}
              {EMPRESA_MIN_SEATS_AT_PACK}+ aplican packs cerrados.
            </p>
          </div>
        ) : null}

        {/* Ciclo */}
        {targetPlan !== BillingPlan.free ? (
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-medium text-heading">Ciclo</legend>
            <CycleOption
              checked={cycle === BillingCycle.monthly}
              onChange={() => setCycle(BillingCycle.monthly)}
              label="Mensual"
              hint={`${formatARS(monthlyTotal)} por mes`}
            />
            <CycleOption
              checked={cycle === BillingCycle.annual}
              onChange={() => setCycle(BillingCycle.annual)}
              label={`Anual (-${Math.round(ANNUAL_TRANSFER_DISCOUNT * 100)}% con transferencia)`}
              hint={`${formatARS(annualTransfer)} con transferencia`}
            />
          </fieldset>
        ) : null}
        <input type="hidden" name="cycle" value={cycle} />

        {/* Método de pago */}
        {targetPlan !== BillingPlan.free ? (
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-medium text-heading">Forma de pago</legend>
            <MethodOption
              checked={method === PaymentMethod.card}
              onChange={() => setMethod(PaymentMethod.card)}
              label="Tarjeta (Mercado Pago)"
              hint="Cobro recurrente automático."
            />
            <MethodOption
              checked={method === PaymentMethod.transfer}
              onChange={() => setMethod(PaymentMethod.transfer)}
              label="Transferencia"
              hint={
                cycle === BillingCycle.annual
                  ? `${Math.round(ANNUAL_TRANSFER_DISCOUNT * 100)}% off pagando todo el año.`
                  : isPersonal
                    ? "Solo disponible en plan anual."
                    : "Recibís CBU al confirmar."
              }
              disabled={isPersonal && cycle === BillingCycle.monthly}
            />
          </fieldset>
        ) : null}
        <input type="hidden" name="paymentMethod" value={method} />

        {/* Resumen */}
        <div className="rounded-xl border border-black/[0.06] bg-page/40 p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Total a cobrar</p>
          <p className="text-2xl font-semibold text-heading">{formatARS(total)}</p>
          <p className="text-xs text-muted">
            {targetPlan === BillingPlan.free
              ? "Pasás a gratuito y degradamos las features al toque."
              : cycle === BillingCycle.monthly
                ? "Cada 30 días renueva en automático mientras tengas el plan activo."
                : method === PaymentMethod.transfer
                  ? "Pago único anual con descuento (10%)."
                  : "Pago anual con tarjeta, sin descuento."}
          </p>
        </div>

        {state?.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        <button
          type="submit"
          className="app-btn app-btn-primary w-full sm:w-auto"
          disabled={pending || cycleDisabledForPersonal}
        >
          {pending
            ? "Procesando…"
            : targetPlan === BillingPlan.free
              ? "Pasar a Gratis"
              : "Confirmar y pagar"}
        </button>
        {cycleDisabledForPersonal ? (
          <p className="text-xs text-amber-600">
            Para particulares, anual solo está disponible con transferencia.
          </p>
        ) : null}
      </form>
    </section>
  );
}

function PlanOption(props: {
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  price: string;
  tagline: string;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition ${
        props.checked
          ? "border-accent bg-accent/5"
          : "border-black/[0.08] hover:border-black/20"
      }`}
    >
      <input
        type="radio"
        name="plan-option"
        value={props.value}
        checked={props.checked}
        onChange={props.onChange}
        className="sr-only"
      />
      <span className="text-sm font-semibold text-heading">{props.title}</span>
      <span className="text-base font-bold text-heading">{props.price}</span>
      <span className="text-xs text-muted">{props.tagline}</span>
    </label>
  );
}

function CycleOption(props: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 ${
        props.checked
          ? "border-accent bg-accent/5"
          : "border-black/[0.08] hover:border-black/20"
      }`}
    >
      <input
        type="radio"
        name="cycle-option"
        checked={props.checked}
        onChange={props.onChange}
        className="sr-only"
      />
      <span className="text-sm font-medium text-heading">{props.label}</span>
      <span className="text-xs text-muted">{props.hint}</span>
    </label>
  );
}

function MethodOption(props: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition ${
        props.disabled
          ? "cursor-not-allowed border-black/[0.05] bg-black/[0.02] opacity-60"
          : props.checked
            ? "border-accent bg-accent/5"
            : "border-black/[0.08] hover:border-black/20"
      }`}
    >
      <input
        type="radio"
        name="method-option"
        checked={props.checked}
        onChange={props.onChange}
        disabled={props.disabled}
        className="sr-only"
      />
      <span className="text-sm font-medium text-heading">{props.label}</span>
      <span className="text-xs text-muted">{props.hint}</span>
    </label>
  );
}
