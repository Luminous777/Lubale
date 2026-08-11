import Link from "next/link";
import { auth } from "@/auth";
import { MarketingHeader } from "@/components/MarketingHeader";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
          <header className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              Tarjetas digitales con QR
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-heading sm:text-5xl sm:leading-tight">
              Tu tarjeta, en un link.
              <br className="hidden sm:block" />
              Para vos o para todo tu equipo.
            </h1>
            <p className="text-lg leading-relaxed text-muted">
              Compartí tus datos con un QR y un link público. Para particulares es gratis con un
              enlace de WhatsApp; para empresas, gestionás todas las tarjetas desde un mismo
              panel.
            </p>
            {session ? (
              <Link className="app-btn-primary" href="/dashboard">
                Ir al panel
              </Link>
            ) : null}
          </header>

          {!session ? (
            <section className="grid gap-6 lg:grid-cols-2">
              <ChoiceCard
                badge="Para vos"
                title="Soy particular"
                price="Gratis para empezar"
                description="Una tarjeta digital con tu foto, datos de contacto y enlace de WhatsApp. Cuando quieras, pasá a Pro y sumá IA, marca personal y enlaces ilimitados."
                features={[
                  "1 tarjeta con QR pública",
                  "URL con tu nombre: tarjetas.app/juan-perez",
                  "Pro: IA, marca y todos los enlaces (desde $1.599/mes)",
                ]}
                primaryCta={{ href: "/signup/personal", label: "Crear mi tarjeta gratis" }}
                secondaryCta={{ href: "/precios", label: "Ver precios" }}
              />
              <ChoiceCard
                badge="Para tu equipo"
                title="Soy empresa"
                price="14 días de prueba"
                description="Tarjetas para todos los empleados, marca compartida y panel multi-usuario. Cuando alguien deja la empresa, el QR sigue siendo tuyo y lo reasignás."
                features={[
                  "Una tarjeta por empleado, todas con tu marca",
                  "URL con tu marca: tarjetas.app/empresa/empleado",
                  "IA para marca y para cada empleado (6+6/mes)",
                ]}
                primaryCta={{ href: "/register", label: "Crear cuenta de empresa" }}
                secondaryCta={{ href: "/precios", label: "Ver planes y precios" }}
                highlight
              />
            </section>
          ) : null}

          <section className="grid gap-5 sm:grid-cols-3">
            {[
              {
                title: "QR universal",
                body: "Una URL estable por tarjeta: funciona en iPhone y Android sin apps.",
              },
              {
                title: "vCard al toque",
                body: "Descarga de contacto compatible con cualquier agenda.",
              },
              {
                title: "Generación con IA",
                body: "Subí una foto o describí el negocio y la IA arma tarjeta, marca y fondo.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="app-card p-6 transition hover:shadow-[0_8px_28px_rgba(0,0,0,0.07)]"
              >
                <h2 className="text-base font-semibold text-heading">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </section>

          {!session ? (
            <section className="flex flex-col items-center gap-3 rounded-2xl border border-black/[0.06] bg-surface px-6 py-10 text-center">
              <p className="text-sm text-muted">¿Ya tenés cuenta?</p>
              <Link href="/login" className="app-btn-secondary">
                Iniciar sesión
              </Link>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function ChoiceCard(props: {
  badge: string;
  title: string;
  price: string;
  description: string;
  features: string[];
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
  highlight?: boolean;
}) {
  return (
    <article
      className={`flex flex-col gap-5 rounded-2xl border p-8 transition ${
        props.highlight
          ? "border-accent bg-accent/5 shadow-[0_18px_40px_rgba(63,103,196,0.12)]"
          : "border-black/[0.08] bg-white hover:border-black/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
          {props.badge}
        </span>
        <span className="text-xs font-medium text-muted">{props.price}</span>
      </div>
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-heading">{props.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{props.description}</p>
      </div>
      <ul className="flex flex-col gap-2 text-sm text-heading">
        {props.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-2 sm:flex-row">
        <Link
          href={props.primaryCta.href}
          className={`app-btn flex-1 text-center ${
            props.highlight ? "app-btn-primary" : "app-btn-primary"
          }`}
        >
          {props.primaryCta.label}
        </Link>
        <Link
          href={props.secondaryCta.href}
          className="app-btn app-btn-secondary flex-1 text-center"
        >
          {props.secondaryCta.label}
        </Link>
      </div>
    </article>
  );
}
