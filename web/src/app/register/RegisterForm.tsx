"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setLoading(false);
      setError(data?.error ?? "No se pudo registrar");
      return;
    }
    const sign = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (sign?.error) {
      setError("Cuenta creada, pero el inicio de sesión falló. Prueba en /login.");
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-heading">Crear cuenta</h1>
        <p className="mt-2 text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link className="app-link font-medium" href="/login">
            Inicia sesión
          </Link>
        </p>
      </div>

      <form onSubmit={onSubmit} className="app-card flex flex-col gap-4 p-8">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Nombre (opcional)</span>
          <input
            className="app-input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
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
          <span className="font-medium text-heading">Contraseña (mín. 8)</span>
          <input
            className="app-input w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="app-btn-primary mt-2 w-full" type="submit" disabled={loading}>
          {loading ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
