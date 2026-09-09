import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";

export const metadata: Metadata = {
  title: "Lubela — Tarjetas digitales para empresas",
  description:
    "Cada persona con su tarjeta digital, su QR y su link. Vos controlás la marca desde un panel — y cada escaneo vuelve como un contacto con nombre y contexto.",
};

const PROOF = [
  { value: "12.400", label: "escaneos / mes" },
  { value: "31%", label: "dejan sus datos" },
  { value: "2 min", label: "para la primera" },
];

const CARD_LINKS = [
  { mark: "◈", label: "WhatsApp", value: "+54 9 11 5544 2210" },
  { mark: "✉", label: "Email", value: "camila@estudioruiz.com" },
  { mark: "◉", label: "Instagram", value: "@estudioruiz" },
  { mark: "⌘", label: "Web", value: "estudioruiz.com" },
  { mark: "⌖", label: "Estudio", value: "Av. Libertador 3240, CABA" },
];

const STEPS = [
  {
    num: "01",
    title: "Armás la marca una vez",
    body: "Logo, colores y fondo. Cada tarjeta del equipo los hereda — nadie improvisa.",
  },
  {
    num: "02",
    title: "Cada persona comparte su link",
    body: "QR en la pantalla, en la firma del mail o impreso. Se actualiza sin reimprimir nada.",
  },
  {
    num: "03",
    title: "Los contactos vuelven solos",
    body: "Quien escanea puede dejar sus datos. Llegan con nombre, empresa y contexto.",
  },
];

const FEATURES = [
  { title: "Panel por organización", body: "Roles de admin y agente, invitaciones y asientos." },
  { title: "Analítica real", body: "Vistas por tarjeta y clicks por cada link." },
  { title: "IA para arrancar", body: "Bio, puesto y paleta sugeridas en segundos." },
  { title: "Contactos exportables", body: "CSV o directo al CRM que ya usás." },
];

export default function LandingPage() {
  return (
    <main className="bg-white">
      {/* NAV */}
      <header className="flex h-[66px] items-center justify-between border-b border-navy/[0.08] px-6 lg:px-12">
        <span className="font-serif text-[22px] tracking-[0.08em] text-navy">LUBELA</span>
        <nav className="hidden items-center gap-7 text-[13.5px] text-navy/75 lg:flex">
          <Link href="/precios" className="hover:text-navy transition-colors">Precios</Link>
          <Link href="/login" className="text-navy hover:text-navy/70 transition-colors">Ingresar</Link>
          <Link
            href="/crear"
            className="rounded-[10px] bg-navy px-[19px] py-[11px] text-white hover:bg-navy-deep transition-colors"
          >
            Crear mi tarjeta
          </Link>
        </nav>
        {/* Mobile CTA */}
        <Link
          href="/crear"
          className="rounded-[10px] bg-navy px-4 py-2.5 text-sm text-white lg:hidden"
        >
          Empezar
        </Link>
      </header>

      {/* HERO */}
      <section className="flex flex-col gap-10 px-6 pb-12 pt-12 lg:flex-row lg:items-center lg:gap-14 lg:px-12 lg:pb-16 lg:pt-16">
        {/* Copy */}
        <div className="flex flex-1 flex-col gap-[22px]">
          <span className="self-start rounded-full bg-bone px-3.5 py-[7px] text-[10.5px] uppercase tracking-[0.16em] text-muted">
            Para empresas y equipos comerciales
          </span>
          <h1 className="max-w-[620px] font-serif text-[46px] leading-[1.06] tracking-[-0.01em] text-pretty lg:text-[60px]">
            Toda tu fuerza de ventas, una sola identidad
          </h1>
          <p className="max-w-[480px] text-[16px] leading-[1.65] text-navy/70 text-pretty lg:text-[17px]">
            Cada persona con su tarjeta digital, su QR y su link. Vos controlás la marca desde un
            panel — y cada escaneo vuelve como un contacto con nombre y contexto.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Link
              href="/crear"
              className="rounded-xl bg-navy px-7 py-4 text-[15px] font-medium text-white hover:bg-navy-deep transition-colors"
            >
              Empezar gratis
            </Link>
            <Link
              href="/precios"
              className="rounded-xl border border-navy/[0.18] px-[26px] py-4 text-[15px] hover:bg-bone transition-colors"
            >
              Ver planes
            </Link>
          </div>
          <dl className="mt-2.5 flex flex-wrap gap-7">
            {PROOF.map((p) => (
              <div key={p.label} className="flex flex-col gap-[3px]">
                <dt className="font-serif text-[26px] leading-none">{p.value}</dt>
                <dd className="text-[11px] uppercase tracking-[0.12em] text-label">{p.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* MOCKUP — solo desktop */}
        <div className="hidden w-[446px] flex-none items-center justify-end gap-4 lg:flex">
          <aside className="flex w-[158px] flex-none flex-col gap-3.5">
            {/* Notificación nuevo contacto */}
            <div className="flex flex-col gap-2.5 rounded-2xl border border-navy/10 bg-white p-[15px] shadow-[0_20px_44px_-24px_rgba(19,38,63,0.3)]">
              <div className="flex items-center gap-2">
                <span className="size-[7px] flex-none rounded-full bg-green" />
                <span className="text-[9px] uppercase tracking-[0.14em] text-label">Nuevo contacto</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-[34px] flex-none place-items-center rounded-full bg-bone font-serif text-[13px]">
                  MG
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs">Mariano Gómez</span>
                  <span className="text-[10.5px] text-label">hace 4 min</span>
                </div>
              </div>
              <p className="text-[10.5px] leading-[1.5] text-muted">
                Constructora Delta · escaneó tu QR impreso
              </p>
            </div>

            {/* QR */}
            <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-navy/10 bg-white p-[15px] shadow-[0_20px_44px_-24px_rgba(19,38,63,0.3)]">
              <QRCode value="https://lubela.app/camila" size={92} fgColor="#13263F" bgColor="#FFFFFF" />
              <span className="text-[9.5px] uppercase tracking-[0.1em] text-label">lubela.app/camila</span>
            </div>

            {/* Stat */}
            <div className="flex flex-col gap-[5px] rounded-2xl bg-navy p-[15px]">
              <span className="font-serif text-2xl leading-none text-white">412</span>
              <span className="text-[9px] uppercase tracking-[0.14em] text-white/55">escaneos este mes</span>
            </div>
          </aside>

          <PhoneMock />
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="bg-bone px-6 py-12 lg:px-12 lg:py-14">
        <h2 className="mb-[26px] text-[10.5px] uppercase tracking-[0.2em] text-label">Cómo funciona</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <article key={s.num} className="flex flex-col gap-[11px] rounded-2xl bg-white p-6">
              <span className="font-serif text-[30px] leading-none text-navy/25">{s.num}</span>
              <h3 className="text-[17px] font-medium">{s.title}</h3>
              <p className="text-[13.5px] leading-[1.65] text-muted text-pretty">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-12 lg:px-12 lg:py-14">
        <div className="mb-[26px] flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-serif text-[34px]">Pensado para empresas</h2>
          <Link href="/precios" className="text-[13.5px] text-muted hover:text-navy transition-colors">
            Ver todos los planes →
          </Link>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="flex flex-col gap-[9px] rounded-2xl border border-navy/10 p-[22px]"
            >
              <h3 className="text-[15px] font-medium">{f.title}</h3>
              <p className="text-[13px] leading-[1.6] text-muted text-pretty">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-6 mb-14 flex flex-col items-start gap-6 rounded-[22px] bg-navy p-9 sm:flex-row sm:items-center sm:justify-between sm:gap-9 sm:p-11 lg:mx-12">
        <div className="flex flex-col gap-[11px]">
          <h2 className="font-serif text-3xl leading-[1.14] text-white lg:text-4xl">
            ¿Cuántas tarjetas quedaron en un cajón?
          </h2>
          <p className="max-w-[520px] text-[14.5px] leading-[1.6] text-white/60">
            Armá la primera en dos minutos. Sin tarjeta de crédito.
          </p>
        </div>
        <Link
          href="/crear"
          className="flex-none rounded-xl bg-white px-[30px] py-[17px] text-[15px] font-medium text-navy hover:bg-bone transition-colors"
        >
          Crear mi tarjeta
        </Link>
      </section>

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

function PhoneMock() {
  return (
    <div className="relative h-[648px] w-[272px] flex-none rounded-[44px] bg-navy-deep p-[9px] shadow-[0_40px_80px_-28px_rgba(14,27,46,0.6)]">
      <div className="relative flex size-full flex-col overflow-hidden rounded-[36px] bg-white">
        {/* Status bar */}
        <div className="absolute inset-x-0 top-0 z-30 flex h-11 items-center justify-between px-[22px] pt-3.5 text-[11px] font-medium text-white">
          <span>9:41</span>
          <span className="text-[9px] tracking-[0.06em] opacity-85">▮▮▮ ⌁ ▰</span>
        </div>
        {/* Notch */}
        <div className="absolute left-1/2 top-[9px] z-40 h-6 w-[86px] -translate-x-1/2 rounded-full bg-navy-deep" />

        {/* Header navy */}
        <div className="relative flex flex-none flex-col items-center gap-[11px] bg-navy px-5 pb-5 pt-12">
          {/* Logo de empresa */}
          <span className="absolute left-[18px] top-12 grid size-[22px] place-items-center rounded-md border border-white/20 bg-white/[0.14] font-serif text-[10px] text-white">
            ER
          </span>
          {/* Avatar */}
          <span className="grid size-[76px] place-items-center rounded-full border border-white/30 pl-[0.08em] font-serif text-[26px] tracking-[0.08em] text-white">
            CR
          </span>
          <div className="flex flex-col gap-1 text-center">
            <span className="font-serif text-[22px] leading-[1.1] text-white">Camila Ruiz</span>
            <span className="text-[8.5px] uppercase tracking-[0.18em] text-white/60">Arquitecta · Directora</span>
            <span className="text-[9px] tracking-[0.04em] text-white/40">Estudio Ruiz</span>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex flex-col gap-3 px-[18px] pb-4 pt-[13px]">
          <p className="text-center text-[10.5px] leading-[1.6] text-navy/70">
            Diseño de interiores y obra nueva en Buenos Aires.
          </p>

          {/* Botones de contacto rápido */}
          <div className="flex justify-center gap-[9px]">
            {["✆", "◈", "✉", "◉", "in"].map((mark) => (
              <span
                key={mark}
                className="grid size-9 place-items-center rounded-full border border-navy/[0.14] font-serif text-[13px] text-navy"
              >
                {mark}
              </span>
            ))}
          </div>

          {/* Lista de links */}
          <ul className="flex flex-col">
            {CARD_LINKS.map((l) => (
              <li key={l.label} className="flex items-center gap-2.5 border-b border-navy/[0.07] py-[9px]">
                <span className="grid size-6 flex-none place-items-center rounded-[7px] bg-bone font-serif text-[10px] text-navy">
                  {l.mark}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-navy/30">{l.label}</span>
                  <span className="truncate text-[10.5px] text-navy">{l.value}</span>
                </div>
                <span className="flex-none text-[11px] text-navy/25">›</span>
              </li>
            ))}
          </ul>

          <span className="mt-px grid h-8 place-items-center rounded-[9px] bg-navy text-[10.5px] text-white">
            Dejar mis datos
          </span>
        </div>
      </div>
    </div>
  );
}
