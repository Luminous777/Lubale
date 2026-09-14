"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const justReset = searchParams.get("reset") === "ok";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Credenciales inválidas");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-heading">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-muted">
          ¿No tienes cuenta?{" "}
          <Link className="app-link font-medium" href="/register">
            Regístrate
          </Link>
        </p>
      </div>

      {justReset ? (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Tu contraseña se actualizó. Iniciá sesión con la nueva.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="app-card flex flex-col gap-4 p-8">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Email</span>
          <input
            className="app-input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-heading">Contraseña</span>
            <Link className="app-link text-xs font-medium" href="/recuperar">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            className="app-input w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="app-btn-primary mt-2 w-full" type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
