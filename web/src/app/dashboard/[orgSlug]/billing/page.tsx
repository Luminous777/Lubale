// app/dashboard/[orgSlug]/billing/page.tsx — Server Component
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';
import PlanActions from './PlanActions';
import SeatManager from './SeatManager';

const PLAN_LABELS: Record<string, { name: string; price: string; unit: string }> = {
  free:     { name: 'Esencial',      price: 'Gratis',   unit: '' },
  pro:      { name: 'Profesional',   price: '$1.599',   unit: '/mes' },
  business: { name: 'Empresa',       price: '$3.999',   unit: '/asiento' },
};

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  active:   { label: 'Activo',           bg: 'bg-green',      fg: 'text-white' },
  trialing: { label: 'En prueba',        bg: 'bg-gold',       fg: 'text-white' },
  past_due: { label: 'Pago pendiente',   bg: 'bg-gold',       fg: 'text-white' },
  canceled: { label: 'Cancelado',        bg: 'bg-white/20',   fg: 'text-white' },
  none:     { label: 'Sin suscripción',  bg: 'bg-white/20',   fg: 'text-white' },
};

export default async function BillingPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, isAdmin } = await requireMembership(orgSlug);
  if (!isAdmin) notFound();

  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [invoices, quotas, seatsUsed] = await Promise.all([
    prisma.billingInvoice.findMany({
      where:   { organizationId: org.id },
      orderBy: { periodStart: 'desc' },
      take:    12,
    }),
    prisma.aiQuotaUsage.findMany({ where: { organizationId: org.id, periodStart } }),
    prisma.membership.count({ where: { organizationId: org.id, status: { not: 'disabled' } } }),
  ]);

  const plan   = PLAN_LABELS[org.plan] ?? PLAN_LABELS.free;
  const status = STATUS[org.billingStatus ?? 'none'] ?? STATUS.none;
  const seats  = org.seats ?? 1;

  const unit       = org.plan === 'business' ? 3999 : org.plan === 'pro' ? 1599 : 0;
  const nextCharge = org.plan === 'business' ? unit * seats : unit;

  const quotaOf = (scope: string, field: 'textsUsed' | 'imagesUsed') =>
    quotas.find(q => q.scope === scope)?.[field] ?? 0;

  const aiTotal = org.plan === 'business' ? 12 : org.plan === 'pro' ? 4 : 0;

  const quotaRows = [
    { label: 'Textos de tarjeta',    used: quotaOf('personal', 'textsUsed') + quotaOf('member_card', 'textsUsed'),     total: aiTotal, gold: false },
    { label: 'Imágenes generadas',   used: quotaOf('personal', 'imagesUsed') + quotaOf('member_card', 'imagesUsed'),   total: aiTotal, gold: false },
    { label: 'Branding de la marca', used: quotaOf('org_branding', 'textsUsed'),                                       total: 4,       gold: true  },
  ];

  const trialDaysLeft = org.trialEndsAt
    ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - Date.now()) / 864e5))
    : null;

  return (
    <div className="flex flex-col gap-5 px-9 pb-11 pt-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[34px] leading-[1.1]">Plan y pagos</h1>
        <p className="text-[13.5px] text-muted">{org.name} · Mercado Pago</p>
      </header>

      {org.billingStatus === 'past_due' && (
        <div className="flex items-center justify-between gap-6 rounded-2xl border border-gold/40 bg-gold/[0.07] px-6 py-5">
          <span className="flex flex-col gap-1">
            <span className="text-[14.5px] font-medium">No pudimos cobrar el último pago</span>
            <span className="text-[13px] text-muted">
              Las tarjetas siguen online 7 días más. Después bajan a Esencial.
            </span>
          </span>
          <PlanActions orgSlug={orgSlug} plan={org.plan} label="Actualizar pago" variant="gold" />
        </div>
      )}

      {org.billingStatus === 'trialing' && trialDaysLeft !== null && (
        <div className="flex items-center justify-between gap-6 rounded-2xl bg-navy px-6 py-5">
          <span className="flex items-center gap-4">
            <span className="rounded-full bg-gold px-3 py-[5px] text-[10px] uppercase tracking-[0.14em] text-white">
              {trialDaysLeft} días
            </span>
            <span className="text-[14.5px] text-white">
              Te quedan {trialDaysLeft} días de Profesional. Después pasás a Esencial automáticamente.
            </span>
          </span>
          <PlanActions orgSlug={orgSlug} plan="pro" label="Activar ahora" variant="white" />
        </div>
      )}

      <div className="flex items-stretch gap-3.5">
        {/* ── Plan card ── */}
        <section className="flex flex-1 flex-col gap-4 rounded-[18px] bg-navy p-[26px] text-white">
          <div className="flex items-center gap-2.5">
            <span className="text-[10.5px] uppercase tracking-[0.18em] text-white/50">Plan actual</span>
            <span
              className={`rounded-full px-[11px] py-1 text-[9.5px] uppercase tracking-[0.12em] ${status.bg} ${status.fg}`}
            >
              {status.label}
            </span>
          </div>

          <div className="flex items-baseline gap-2.5">
            <span className="font-serif text-[38px] leading-none">{plan.name}</span>
            <span className="text-sm text-white/60">
              {plan.price}{plan.unit}
            </span>
          </div>

          <dl className="flex gap-7">
            {org.plan === 'business' && (
              <Stat value={`${seatsUsed} / ${seats}`} label="asientos" />
            )}
            <Stat value={money(nextCharge)} label="próximo cargo" />
            <Stat
              value={
                org.currentPeriodEnd
                  ? org.currentPeriodEnd.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                  : '—'
              }
              label="renovación"
            />
          </dl>

          <div className="mt-auto flex gap-2.5">
            <PlanActions orgSlug={orgSlug} plan={org.plan} label="Cambiar plan" variant="white" />
            {org.plan === 'business' && (
              <a
                href="#asientos"
                className="rounded-[11px] border border-white/[0.24] px-[18px] py-3 text-[13.5px]"
              >
                Gestionar asientos
              </a>
            )}
            {org.plan !== 'free' && org.billingStatus === 'active' && (
              <PlanActions orgSlug={orgSlug} plan={org.plan} label="Cancelar" variant="ghost" cancel />
            )}
          </div>
        </section>

        {/* ── AI quota card ── */}
        <section className="flex w-[330px] flex-none flex-col gap-[18px] rounded-[18px] border border-navy/10 p-6">
          <h2 className="text-[10.5px] uppercase tracking-[0.18em] text-label">
            Cuotas de IA este mes
          </h2>
          {aiTotal === 0 ? (
            <p className="text-[12.5px] leading-[1.6] text-muted">
              La IA está disponible en Profesional y Empresa.
            </p>
          ) : (
            quotaRows.map(q => (
              <div key={q.label} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13.5px]">{q.label}</span>
                  <span className="text-[12.5px] text-muted">
                    {q.used} / {q.total}
                  </span>
                </div>
                <span className="h-[5px] overflow-hidden rounded-[3px] bg-bone">
                  <span
                    className={`block h-full ${q.gold ? 'bg-gold' : 'bg-navy'}`}
                    style={{ width: `${Math.min(100, Math.round((q.used / q.total) * 100))}%` }}
                  />
                </span>
              </div>
            ))
          )}
          <p className="mt-auto text-[11.5px] leading-[1.6] text-label">
            El cupo se renueva el primer día de cada mes.
          </p>
        </section>
      </div>

      {/* ── Seat manager (Empresa only) ── */}
      {org.plan === 'business' && (
        <SeatManager orgSlug={orgSlug} seats={seats} used={seatsUsed} unitPrice={1099} />
      )}

      {/* ── Invoice history ── */}
      <section className="overflow-hidden rounded-2xl border border-navy/10">
        <div className="flex items-center justify-between bg-bone px-5 py-[15px]">
          <h2 className="text-[10px] uppercase tracking-[0.14em] text-label">Historial de facturas</h2>
          {invoices.length > 0 && (
            <a href={`/api/billing/invoices.csv?org=${orgSlug}`} className="text-[12.5px] text-muted">
              Descargar todas
            </a>
          )}
        </div>
        {invoices.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-muted">Todavía no hay facturas.</p>
        ) : (
          invoices.map(i => (
            <div
              key={i.id}
              className="grid grid-cols-[1fr_1fr_1fr_0.8fr_0.6fr] items-center gap-3.5 border-t border-navy/[0.07] px-5 py-3.5 text-[13px]"
            >
              <span>
                {i.periodStart.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </span>
              <span className="truncate text-muted">{i.externalRef ?? '—'}</span>
              <span>{money(i.amountCents / 100)}</span>
              <span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[9.5px] uppercase tracking-[0.1em] ${
                    i.paidAt ? 'bg-green/10 text-green' : 'bg-gold/[0.14] text-gold'
                  }`}
                >
                  {i.paidAt ? 'Pagada' : 'Pendiente'}
                </span>
              </span>
              <a
                href={`/api/billing/invoice/${i.id}`}
                className="text-right text-[12.5px] text-muted hover:text-navy"
              >
                PDF
              </a>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-[3px]">
      <dt className="font-serif text-2xl">{value}</dt>
      <dd className="text-[11px] text-white/55">{label}</dd>
    </div>
  );
}

const money = (n: number) =>
  n === 0 ? 'Gratis' : `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
