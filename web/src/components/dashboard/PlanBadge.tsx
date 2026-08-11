import Link from "next/link";
import type { BillingPlan, OrganizationKind } from "@prisma/client";

const LABELS: Record<BillingPlan, string> = {
  free: "Gratis",
  pro: "Pro",
  business: "Empresa",
};

const STYLES: Record<BillingPlan, string> = {
  free: "bg-slate-200 text-slate-800",
  pro: "bg-amber-100 text-amber-900",
  business: "bg-emerald-100 text-emerald-900",
};

type Props = {
  plan: BillingPlan;
  kind: OrganizationKind;
  inTrial: boolean;
  currentPeriodEnd: Date | null;
  /**
   * Calculados en el server (impuro: depende de `Date.now`). Pasar como prop evita el
   * lint de pureza y el desfase server/cliente.
   */
  expired: boolean;
  expiresSoon: boolean;
  /** Cuando se muestra en el sidebar, agrega un CTA a precios. */
  showUpgradeLink?: boolean;
};

export function PlanBadge({
  plan,
  kind,
  inTrial,
  currentPeriodEnd,
  expired,
  expiresSoon,
  showUpgradeLink = false,
}: Props) {
  const label = LABELS[plan];
  const style = STYLES[plan];

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-black/[0.06] bg-white/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style}`}
        >
          {kind === "personal" && plan === "free" ? "Personal · Gratis" : `${kind === "personal" ? "Personal · " : ""}${label}`}
        </span>
        {inTrial ? (
          <span className="text-[10px] font-medium text-accent">en prueba</span>
        ) : null}
      </div>
      {currentPeriodEnd ? (
        <p
          className={`text-[11px] ${
            expired ? "text-red-700" : expiresSoon ? "text-amber-700" : "text-muted"
          }`}
        >
          {expired
            ? `Plan vencido el ${currentPeriodEnd.toLocaleDateString()}`
            : inTrial
              ? `Trial hasta ${currentPeriodEnd.toLocaleDateString()}`
              : `Renueva el ${currentPeriodEnd.toLocaleDateString()}`}
        </p>
      ) : plan === "free" ? (
        <p className="text-[11px] text-muted">Sin pago activo. Probá Pro o Empresa.</p>
      ) : null}
      {showUpgradeLink && plan !== "business" ? (
        <Link
          href="/precios"
          className="text-[11px] font-semibold text-accent transition hover:text-accent-hover"
        >
          {plan === "free" ? "Mejorar plan →" : "Ver planes →"}
        </Link>
      ) : null}
    </div>
  );
}
