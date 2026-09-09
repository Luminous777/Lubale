'use client';

// Next.js no permite `export const metadata` en Client Components.
// Si necesitás metadata para SEO, creá un precios/layout.tsx server component con el export.

import { useState } from 'react';
import Link from 'next/link';

type Cycle = 'mensual' | 'anual';

const PLANS = [
  {
    key: 'free',
    name: 'Esencial',
    price: { mensual: 'Gratis', anual: 'Gratis' },
    unit: '',
    tag: null,
    desc: 'Para probar el formato antes de llevarlo al equipo.',
    cta: 'Empezar gratis',
    href: '/crear',
    items: [
      '1 tarjeta digital',
      'Link y QR propios',
      'Solo un link de WhatsApp',
      'Sin colores personalizados',
      'Sin IA',
    ],
  },
  {
    key: 'pro',
    name: 'Profesional',
    price: { mensual: '$1.599', anual: '$1.439' },
    unit: '/mes',
    tag: 'Más elegido',
    desc: 'Para un profesional independiente que vive de su red.',
    cta: 'Probar 30 días',
    href: '/crear?plan=pro',
    items: [
      'Tarjetas ilimitadas',
      'Links ilimitados de cualquier tipo',
      'Colores y fondo propios',
      'IA de tarjeta · 4 generaciones/mes',
      'Métricas y contactos recibidos',
      'QR con logo',
    ],
  },
  {
    key: 'business',
    name: 'Empresa',
    price: { mensual: '$3.999', anual: '$3.599' },
    unit: '/asiento',
    tag: null,
    desc: 'Para equipos comerciales con una marca que cuidar.',
    cta: 'Hablar con ventas',
    href: '/contacto?motivo=empresa',
    items: [
      'Todo Profesional',
      'Panel de organización y roles',
      'Asientos por empleado',
      'IA de branding',
      'Marca bloqueada para el equipo',
      'Exportación e integraciones',
    ],
  },
] as const;

const FAQ = [
  {
    q: '¿Qué pasa con mi link si dejo de pagar?',
    a: 'Tu tarjeta sigue online en el plan Esencial. Nunca se cae un link que ya compartiste.',
  },
  {
    q: '¿Cómo funcionan los asientos?',
    a: 'Cada persona del equipo con tarjeta propia ocupa un asiento. Podés sumar o quitar cuando quieras.',
  },
  {
    q: '¿Puedo cambiar de plan a mitad de mes?',
    a: 'Sí. Se prorratea la diferencia en el siguiente cargo de Mercado Pago.',
  },
];

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>('mensual');

  return (
    <main className="bg-white">
      {/* NAV */}
      <header className="flex h-[66px] items-center justify-between border-b border-navy/[0.08] px-6 lg:px-12">
        <Link href="/">
          <span className="font-serif text-[22px] tracking-[0.08em] text-navy">LUBELA</span>
        </Link>
        <nav className="hidden items-center gap-7 text-[13.5px] text-navy/75 lg:flex">
          <Link href="/precios" className="text-navy font-medium">Precios</Link>
          <Link href="/login" className="hover:text-navy transition-colors">Ingresar</Link>
          <Link
            href="/crear"
            className="rounded-[10px] bg-navy px-[19px] py-[11px] text-white hover:bg-navy-deep transition-colors"
          >
            Crear mi tarjeta
          </Link>
        </nav>
        <Link
          href="/crear"
          className="rounded-[10px] bg-navy px-4 py-2.5 text-sm text-white lg:hidden"
        >
          Empezar
        </Link>
      </header>

      <div className="px-6 pb-16 pt-12 lg:px-12 lg:pb-16 lg:pt-14">
        {/* Header */}
        <header className="mb-3.5 flex flex-col items-center gap-3">
          <h1 className="font-serif text-[42px] leading-[1.1] lg:text-[46px]">Precios claros</h1>
          <p className="max-w-[520px] text-center text-[15.5px] leading-[1.6] text-muted">
            Empezá gratis. Cambiá de plan cuando tu equipo crezca — tu link nunca deja de funcionar.
          </p>
        </header>

        {/* Toggle ciclo */}
        <div className="mb-[34px] flex justify-center">
          <div className="flex gap-1 rounded-full bg-bone p-1">
            {(['mensual', 'anual'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`rounded-full px-5 py-[9px] text-[13px] transition-colors ${
                  cycle === c ? 'bg-navy text-white' : 'text-muted hover:text-navy'
                }`}
              >
                {c === 'mensual' ? 'Mensual' : 'Anual · 10% off'}
              </button>
            ))}
          </div>
        </div>

        {/* Cards de planes */}
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map(p => {
            const featured = p.key === 'pro';
            return (
              <article
                key={p.key}
                className={`flex flex-col gap-[18px] rounded-[20px] border p-7 ${
                  featured
                    ? 'border-navy bg-navy text-white'
                    : 'border-navy/[0.12] bg-white text-navy'
                }`}
              >
                <div className="flex flex-col gap-[11px]">
                  <div className="flex items-center gap-[9px]">
                    <span className="text-[11px] uppercase tracking-[0.18em] opacity-60">
                      {p.name}
                    </span>
                    {p.tag && (
                      <span className="rounded-full bg-gold px-2.5 py-1 text-[9.5px] uppercase tracking-[0.12em] text-white">
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-[7px]">
                    <span className="font-serif text-[44px] leading-none">{p.price[cycle]}</span>
                    {p.unit && <span className="text-[13px] opacity-60">{p.unit}</span>}
                  </div>
                  <p className="text-[13.5px] leading-[1.6] opacity-70">{p.desc}</p>
                </div>

                <Link
                  href={p.href}
                  className={`grid h-12 place-items-center rounded-xl border text-[14.5px] font-medium transition-opacity hover:opacity-85 ${
                    featured
                      ? 'border-white bg-white text-navy'
                      : 'border-navy bg-navy text-white'
                  }`}
                >
                  {p.cta}
                </Link>

                <div className={`h-px ${featured ? 'bg-white/[0.16]' : 'bg-navy/10'}`} />

                <ul className="flex flex-col gap-2.5">
                  {p.items.map(i => (
                    <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-[1.5]">
                      <span className="flex-none opacity-50">·</span>
                      <span className="opacity-85">{i}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        {/* Asiento extra */}
        <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl bg-bone px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-[5px]">
            <h2 className="text-[14.5px] font-medium">Asiento individual para un empleado más</h2>
            <p className="text-[13px] text-muted">
              Sumá una persona al plan Empresa sin cambiar de plan · $1.099/mes
            </p>
          </div>
          <p className="flex-none text-[13px] text-muted">
            Pagos con Mercado Pago · 10% off anual por transferencia
          </p>
        </div>

        {/* FAQ */}
        <section className="mx-auto mt-14 max-w-[760px]">
          <h2 className="mb-5 text-[10.5px] uppercase tracking-[0.2em] text-label">
            Preguntas frecuentes
          </h2>
          <dl className="flex flex-col">
            {FAQ.map(f => (
              <div
                key={f.q}
                className="flex flex-col gap-2 border-b border-navy/[0.08] py-[18px]"
              >
                <dt className="text-[15px]">{f.q}</dt>
                <dd className="text-[13.5px] leading-[1.65] text-muted text-pretty">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="flex items-center justify-between border-t border-navy/[0.08] px-6 pb-[34px] pt-[26px] lg:px-12">
        <span className="font-serif text-[18px] tracking-[0.08em] text-navy/60">LUBELA</span>
        <div className="flex gap-[22px] text-[12.5px] text-label">
          <Link href="/terminos" className="hover:text-navy transition-colors">Términos</Link>
          <Link href="/privacidad" className="hover:text-navy transition-colors">Privacidad</Link>
        </div>
      </footer>
    </main>
  );
}
