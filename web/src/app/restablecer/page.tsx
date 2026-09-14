import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { RestablecerForm } from "./RestablecerForm";

// Depende del token en searchParams: se renderiza por request.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Restablecer contraseña · Lubela",
  description: "Elegí una nueva contraseña para tu cuenta.",
};

export default async function RestablecerPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      {token ? (
        <RestablecerForm token={token} />
      ) : (
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-12">
          <h1 className="text-2xl font-semibold tracking-tight text-heading">Enlace inválido</h1>
          <p className="text-sm text-muted">
            El enlace no es válido o está incompleto. Pedí uno nuevo desde la página de
            recuperación.
          </p>
          <Link className="app-btn-primary w-full text-center" href="/recuperar">
            Pedir un nuevo enlace
          </Link>
        </div>
      )}
    </div>
  );
}
