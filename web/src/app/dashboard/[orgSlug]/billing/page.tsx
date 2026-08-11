import Link from "next/link";
import { redirect } from "next/navigation";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembershipForUser } from "@/lib/authz";
import {
  aiCardScopeFor,
  aiBrandingScopeFor,
  effectivePlan,
  getPlanFeatures,
  readAiQuota,
} from "@/lib/plan";
import { billingStatusLabel, formatCents } from "@/lib/billing";
import { ChangePlanForm } from "./ChangePlanForm";

export const metadata = { title: "Plan y pagos" };

export default async function BillingPage(props: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ reason?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orgSlug } = await props.params;
  const { reason, status } = await props.searchParams;
  const row = await getMembershipForUser(orgSlug, session.user.id);
  if (!row || row.membership.status !== MembershipStatus.active) redirect("/dashboard");
  if (row.membership.role !== MembershipRole.admin) redirect(`/dashboard/${orgSlug}`);

  const features = getPlanFeatures(row.org);
  const eff = effectivePlan(row.org);

  const profileCount = await prisma.profile.count({ where: { organizationId: row.org.id } });

  // Cuotas vivas: para personal/free, leemos personal scope; para business, leemos branding.
  const cardScope = aiCardScopeFor(row.org);
  const cardQuotaSelf = await readAiQuota({
    organizationId: row.org.id,
    userId: session.user.id,
    scope: cardScope,
    plan: row.org.plan,
  });
  const brandingScope = aiBrandingScopeFor(row.org);
  const brandingQuota =
    row.org.kind === "business"
      ? await readAiQuota({
          organizationId: row.org.id,
          userId: null,
          scope: brandingScope,
          plan: row.org.plan,
        })
      : null;

  const invoices = await prisma.billingInvoice.findMany({
    where: { organizationId: row.org.id },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="border-b border-black/[0.06] pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-heading">Plan y pagos</h1>
        <p className="mt-2 text-sm text-muted">
          Cambiá tu plan, controlá los asientos y revisá tus cobros.
        </p>
      </header>

      {reason === "seats" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Llegaste al máximo de tarjetas para tu plan ({features.maxProfiles}). Sumá asientos
          o mejorá el plan para crear más.
        </div>
      ) : null}
      {status === "pending" ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          Pago pendiente: te enviaremos los datos para completar la transferencia. Cuando lo
          confirmemos, activamos el plan.
        </div>
      ) : null}

      <section className="app-card flex flex-col gap-3 p-6">
        <h2 className="text-base font-semibold text-heading">Plan actual</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Plan vigente</dt>
            <dd className="font-medium text-heading">
              {row.org.plan === "free" ? "Gratis" : row.org.plan === "pro" ? "Pro" : "Empresa"}
              {eff !== row.org.plan ? " (degradado a Gratis por vencimiento)" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Estado</dt>
            <dd className="font-medium text-heading">{billingStatusLabel(row.org.billingStatus)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Asientos</dt>
            <dd className="font-medium text-heading">
              {profileCount} / {features.maxProfiles}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Próxima renovación</dt>
            <dd className="font-medium text-heading">
              {row.org.currentPeriodEnd
                ? row.org.currentPeriodEnd.toLocaleDateString()
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <h2 className="text-base font-semibold text-heading">Cupo de IA este mes</h2>
        <p className="text-xs text-muted">
          El contador se reinicia el día 1° de cada mes. Cada imagen generada (foto, fondo o logo)
          consume 1 unidad. Cada generación de texto consume 1 unidad.
        </p>
        <QuotaCard
          title={
            row.org.kind === "personal"
              ? "Tu tarjeta y marca personal"
              : "Tu tarjeta personal de empleado"
          }
          quota={cardQuotaSelf}
        />
        {brandingQuota ? (
          <QuotaCard title="Marca de la empresa (compartida entre admins)" quota={brandingQuota} />
        ) : null}
      </section>

      <ChangePlanForm
        orgId={row.org.id}
        orgSlug={orgSlug}
        plan={row.org.plan}
        kind={row.org.kind}
        seats={row.org.seats}
        actorEmail={session.user.email ?? ""}
      />

      <section className="app-card flex flex-col gap-3 p-6">
        <h2 className="text-base font-semibold text-heading">Historial</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay cobros registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-black/[0.06] text-left text-xs text-muted">
              <tr>
                <th className="py-2">Fecha</th>
                <th>Concepto</th>
                <th>Método</th>
                <th className="text-right">Monto</th>
                <th className="text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((iv) => (
                <tr key={iv.id} className="border-b border-black/[0.04]">
                  <td className="py-2 text-muted">{iv.createdAt.toLocaleDateString()}</td>
                  <td>{iv.notes ?? "Cobro"}</td>
                  <td className="capitalize">{iv.paymentMethod}</td>
                  <td className="text-right font-medium">
                    {formatCents(iv.amountCents)}
                  </td>
                  <td className="text-right text-xs text-muted">
                    {iv.paidAt ? "Pagado" : "Pendiente"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-center text-xs text-muted">
        ¿Dudas? Escribinos y te ayudamos.{" "}
        <Link href="/precios" className="app-link">
          Ver planes públicos
        </Link>
      </p>
    </div>
  );
}

function QuotaCard({
  title,
  quota,
}: {
  title: string;
  quota: { limit: { images: number; texts: number }; used: { images: number; texts: number } };
}) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-page/40 p-4">
      <p className="text-sm font-medium text-heading">{title}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <QuotaBar label="Imágenes" used={quota.used.images} limit={quota.limit.images} />
        <QuotaBar label="Textos" used={quota.used.texts} limit={quota.limit.texts} />
      </div>
    </div>
  );
}

function QuotaBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-heading">{label}</span>
        <span className={limit === 0 ? "text-muted" : ""}>
          {used} / {limit === 0 ? "—" : limit}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
