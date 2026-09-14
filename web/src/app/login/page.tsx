import { Suspense } from "react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { LoginForm } from "./LoginForm";

// Lee searchParams (callbackUrl, reset) en el cliente: render por request.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-sm text-muted">
            Cargando…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
