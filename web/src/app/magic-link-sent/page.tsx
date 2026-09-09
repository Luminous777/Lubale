// app/magic-link-sent/page.tsx — Server Component
import ResendButton from './ResendButton';
import Link from 'next/link';

export const metadata = { title: 'Revisá tu email', robots: { index: false } };

export default async function MagicLinkSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = '' } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-navy px-6 py-11">
      <div className="flex w-full max-w-[520px] flex-col items-center gap-[26px] text-center">

        {/* Ícono */}
        <span className="grid size-[74px] place-items-center rounded-[20px] border border-white/20 bg-white/10 font-serif text-[26px] text-white">
          ✉
        </span>

        {/* Texto principal */}
        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-[38px] leading-[1.14] text-white">Revisá tu email</h1>
          <p className="text-[15px] leading-[1.7] text-white/65 text-pretty">
            Te mandamos un link a{' '}
            <span className="text-white">{email || 'tu casilla'}</span>. Hacé clic y entrás directo
            — el link vence en 15 minutos.
          </p>
        </div>

        {/* Mientras esperás */}
        <section className="flex w-full flex-col gap-3 rounded-2xl bg-white/[0.07] p-5">
          <h2 className="text-[10.5px] uppercase tracking-[0.16em] text-white/45">Mientras esperás</h2>
          <div className="flex gap-[11px]">
            <a
              href="https://apps.apple.com/app/lubela"
              className="flex-1 rounded-[11px] border border-white/20 p-3.5 text-[12.5px] text-white transition hover:bg-white/5"
            >
              Descargar la app iOS
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=app.lubela"
              className="flex-1 rounded-[11px] border border-white/20 p-3.5 text-[12.5px] text-white transition hover:bg-white/5"
            >
              Descargar la app Android
            </a>
          </div>
          <p className="text-[11.5px] leading-[1.6] text-white/45">
            Si ya la tenés instalada, el link del email te abre la app autenticado.
          </p>
        </section>

        {/* Acciones */}
        <div className="flex gap-5 text-[12.5px] text-white/50">
          <ResendButton email={email} />
          <Link href="/crear" className="transition hover:text-white/80">
            Cambiar de email
          </Link>
        </div>

        {/* No me llegó */}
        <details className="w-full text-left">
          <summary className="cursor-pointer list-none text-[12.5px] text-white/40 transition hover:text-white/70">
            No me llegó el email
          </summary>
          <ul className="mt-3 flex flex-col gap-2 text-[12.5px] leading-[1.6] text-white/45">
            <li>· Puede tardar hasta un minuto en aparecer.</li>
            <li>· Mirá en spam o en la pestaña Promociones de Gmail.</li>
            <li>· El remitente es hola@lubela.app.</li>
          </ul>
        </details>

        <Link href="/" className="mt-2 font-serif text-[16px] tracking-[0.1em] text-white/30 transition hover:text-white/50">
          LUBELA
        </Link>
      </div>
    </main>
  );
}
