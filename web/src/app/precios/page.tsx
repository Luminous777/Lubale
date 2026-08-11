import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import {
  ANNUAL_TRANSFER_DISCOUNT,
  PRICES_ARS_CENTS,
  priceAnnualTransferCents,
} from "@/lib/plan";

export const metadata = {
  title: "Precios — Tarjetas digitales",
  description:
    "Plan gratis para particulares, plan Pro para profesionales y plan Empresa para equipos.",
};

function ars(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function PricingPage() {
  const proAnnual = priceAnnualTransferCents(PRICES_ARS_CENTS.particularPro);
  const extraAnnual = priceAnnualTransferCents(PRICES_ARS_CENTS.empleadoExtra);
  const empresaAnnual = priceAnnualTransferCents(PRICES_ARS_CENTS.empresaPerSeat);
  const discountPct = Math.round(ANNUAL_TRANSFER_DISCOUNT * 100);

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-16">
          <header className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Precios</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-heading sm:text-5xl">
              Un plan para cada tipo de profesional
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Empezá gratis con tu tarjeta digital y un enlace de WhatsApp. Cuando lo necesites,
              sumá IA, varios enlaces y marca personalizada.
            </p>
            <p className="mt-2 text-sm text-muted">
              Pagando anual con transferencia, ahorrás un {discountPct}%.
            </p>
          </header>

          <section className="grid gap-6 lg:grid-cols-4">
            <PlanCard
              title="Particular Free"
              tagline="Para empezar."
              priceLabel={ars(0)}
              priceUnit="para siempre"
              cta={{ href: "/signup/personal", label: "Crear gratis" }}
              features={[
                "1 tarjeta digital pública",
                "Foto y datos básicos",
                "1 enlace (solo WhatsApp)",
                "URL pública con tu nombre",
                "Sin generación con IA",
              ]}
            />

            <PlanCard
              title="Particular Pro"
              tagline="Tu marca personal."
              priceLabel={ars(PRICES_ARS_CENTS.particularPro)}
              priceUnit="por mes"
              annualHint={`o ${ars(proAnnual)}/año (-${discountPct}% con transferencia)`}
              cta={{ href: "/signup/personal", label: "Empezar prueba" }}
              highlight
              features={[
                "Todo lo de Free",
                "Enlaces ilimitados (web, social, mail…)",
                "Marca personal: logo, colores, fondo",
                "Generador con IA: 4 imágenes + 4 textos al mes",
                "Fondo de tarjeta personalizado",
              ]}
            />

            <PlanCard
              title="Empleado extra"
              tagline="Si ya estás en una empresa con cuenta."
              priceLabel={ars(PRICES_ARS_CENTS.empleadoExtra)}
              priceUnit="por mes"
              annualHint={`o ${ars(extraAnnual)}/año (-${discountPct}% con transferencia)`}
              cta={{ href: "/signup/personal", label: "Sumar tarjeta personal" }}
              features={[
                "Tu tarjeta personal aparte de la empresa",
                "Enlaces ilimitados",
                "Marca personal y fondo a medida",
                "IA: 4 imágenes + 4 textos al mes",
                "Tarifa preferencial al estar activo en una empresa",
              ]}
            />

            <PlanCard
              title="Empresa"
              tagline="Para equipos y franquicias."
              priceLabel={ars(PRICES_ARS_CENTS.empresaPerSeat)}
              priceUnit="por asiento / mes"
              annualHint={`o ${ars(empresaAnnual)}/asiento al año (-${discountPct}%)`}
              cta={{ href: "/register", label: "Crear empresa" }}
              features={[
                "Tarjetas para todos los empleados",
                "Marca compartida (logo, colores, fondo)",
                "IA marca: 6 imágenes + 6 textos / mes",
                "IA por empleado: 6 imágenes + 6 textos / mes",
                "URLs por empresa y por empleado",
                "Trial de 14 días sin tarjeta",
              ]}
            />
          </section>

          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FaqItem
              question="¿Qué pasa si me vence el plan?"
              answer="Si sos particular, perdés la IA y los enlaces se podan a un único WhatsApp. Si sos empresa, las tarjetas que sobrepasen los asientos pagados quedan desactivadas hasta que renoves o reduzcas equipo."
            />
            <FaqItem
              question="¿Cómo se paga?"
              answer="Por Mercado Pago: con tarjeta (recurrente automático) o por transferencia (anual con 10% off)."
            />
            <FaqItem
              question="¿Hay prueba gratis?"
              answer="Las empresas tienen 14 días de prueba al crear la cuenta. Los particulares pueden quedarse en Free o subir a Pro cuando quieran."
            />
            <FaqItem
              question="¿La IA tiene límite?"
              answer="Cada generación de imagen (foto, fondo o logo) y cada texto cuentan como 1 unidad. El cupo se reinicia el día 1° de cada mes."
            />
            <FaqItem
              question="¿Puedo bajarme cuando quiera?"
              answer="Sí, podés cancelar el plan desde el panel y se mantiene activo hasta el fin del período pagado."
            />
            <FaqItem
              question="¿La URL pública qué forma tiene?"
              answer="Particulares: tarjetas.app/tu-nombre. Empresas: tarjetas.app/empresa/empleado. Si tu nombre está ocupado, sugerimos un sufijo numérico."
            />
          </section>

          <section className="rounded-2xl bg-accent/5 p-8 text-center">
            <h2 className="text-2xl font-semibold text-heading">¿Tenés equipo grande o dudas?</h2>
            <p className="mt-2 text-muted">Hablanos y armamos un plan a medida.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href="/signup/personal" className="app-btn app-btn-primary">
                Crear mi tarjeta gratis
              </Link>
              <Link href="/register" className="app-btn app-btn-secondary">
                Crear empresa
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function PlanCard(props: {
  title: string;
  tagline: string;
  priceLabel: string;
  priceUnit: string;
  annualHint?: string;
  cta: { href: string; label: string };
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-5 rounded-2xl border p-6 ${
        props.highlight
          ? "border-accent bg-accent/5 shadow-[0_12px_32px_rgba(63,103,196,0.12)]"
          : "border-black/[0.08] bg-white"
      }`}
    >
      <div>
        <h3 className="text-lg font-semibold text-heading">{props.title}</h3>
        <p className="mt-1 text-sm text-muted">{props.tagline}</p>
      </div>
      <div>
        <p className="text-3xl font-bold text-heading">{props.priceLabel}</p>
        <p className="text-sm text-muted">{props.priceUnit}</p>
        {props.annualHint ? (
          <p className="mt-1 text-xs text-accent">{props.annualHint}</p>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2 text-sm text-heading">
        {props.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={props.cta.href}
        className={`app-btn w-full text-center ${
          props.highlight ? "app-btn-primary" : "app-btn-secondary"
        }`}
      >
        {props.cta.label}
      </Link>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <article className="rounded-2xl border border-black/[0.06] bg-white p-5">
      <h3 className="text-sm font-semibold text-heading">{question}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{answer}</p>
    </article>
  );
}
