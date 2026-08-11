import Link from "next/link";
import type { CSSProperties } from "react";

type Variant = {
  id: string;
  name: string;
  description: string;
  vars: CSSProperties;
};

/** Cobalto (pedido) + dos azules típicamente “corporativos”: marino e institucional. */
const VARIANTS: Variant[] = [
  {
    id: "cobalto",
    name: "Cobalto",
    description: "Azul medio con buena presencia; versátil para producto B2B.",
    vars: {
      "--accent": "#3f67c4",
      "--accent-hover": "#3458b0",
      "--accent-soft": "rgba(63, 103, 196, 0.16)",
      "--ring-focus": "rgba(63, 103, 196, 0.28)",
    } as CSSProperties,
  },
  {
    id: "marino",
    name: "Marino",
    description: "Azul marino más oscuro: serio, banca y consultoría.",
    vars: {
      "--accent": "#2c4f7a",
      "--accent-hover": "#234162",
      "--accent-soft": "rgba(44, 79, 122, 0.16)",
      "--ring-focus": "rgba(44, 79, 122, 0.28)",
    } as CSSProperties,
  },
  {
    id: "institucional",
    name: "Institucional",
    description: "Azul clásico institucional, sobrio y reconocible en dashboards.",
    vars: {
      "--accent": "#265b9e",
      "--accent-hover": "#1e4d88",
      "--accent-soft": "rgba(38, 91, 158, 0.16)",
      "--ring-focus": "rgba(38, 91, 158, 0.28)",
    } as CSSProperties,
  },
];

function SampleChrome() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-black/[0.08] bg-surface p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-body">Texto de ejemplo en el panel.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="app-btn-primary">
          Botón primario
        </button>
        <button type="button" className="app-btn-secondary">
          Secundario
        </button>
        <button type="button" className="app-btn-ghost">
          Ghost
        </button>
      </div>
      <p className="text-sm">
        <span className="font-medium text-accent underline decoration-accent underline-offset-[3px]">
          Enlace de acento
        </span>
      </p>
      <div className="flex items-center gap-2 rounded-lg px-3 py-2">
        <span className="rounded-full border-l-4 border-l-accent bg-accent-soft py-1.5 pl-3 pr-2 text-sm font-semibold text-heading">
          Item activo (sidebar)
        </span>
      </div>
    </div>
  );
}

export default function ThemePreviewPage() {
  return (
    <div className="min-h-screen bg-page px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 border-b border-black/[0.06] pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-heading">
            Azules profesionales
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            <strong>Cobalto</strong> es el predeterminado en la app. Aquí lo comparás con{" "}
            <strong>Marino</strong> e <strong>Institucional</strong> (solo esta página de prueba).
          </p>
          <Link href="/" className="app-link mt-4 inline-block text-sm">
            ← Volver al inicio
          </Link>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          {VARIANTS.map((v) => (
            <section
              key={v.id}
              className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-surface/80 p-5 shadow-[var(--shadow-card)]"
              style={v.vars}
            >
              <div>
                <h2 className="text-lg font-semibold text-heading">{v.name}</h2>
                <p className="mt-1 text-xs text-muted">{v.description}</p>
                <p className="mt-2 font-mono text-[11px] text-muted">
                  accent: {(v.vars as Record<string, string>)["--accent"]}
                </p>
              </div>
              <SampleChrome />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
