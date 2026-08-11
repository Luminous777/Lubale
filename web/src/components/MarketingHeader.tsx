import Link from "next/link";
import { auth } from "@/auth";

export async function MarketingHeader() {
  const session = await auth();

  return (
    <header className="border-b border-black/[0.06] bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-heading">
          Tarjetas<span className="text-accent">B2B</span>
        </Link>
        <nav className="flex items-center gap-4">
          {session ? (
            <Link href="/dashboard" className="app-link text-sm">
              Panel
            </Link>
          ) : (
            <>
              <Link href="/precios" className="text-sm font-medium text-muted transition hover:text-heading">
                Precios
              </Link>
              <Link href="/login" className="text-sm font-medium text-muted transition hover:text-heading">
                Entrar
              </Link>
              <Link
                href="/signup/personal"
                className="inline-flex h-9 items-center justify-center rounded-full bg-accent px-4 text-xs font-medium text-white transition hover:bg-accent-hover"
              >
                Crear tarjeta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
