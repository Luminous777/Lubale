"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function PersonalSignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/signup/personal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, handle, email, password }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: true; handle?: string; error?: string }
      | null;
    if (!res.ok || !data?.ok) {
      setLoading(false);
      setError(data?.error ?? "No se pudo crear la cuenta");
      return;
    }
    const sign = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (sign?.error) {
      setError("Cuenta creada, pero el inicio de sesión falló. Probá en /login.");
      return;
    }
    router.push(`/dashboard/${data.handle}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="app-card flex flex-col gap-4 p-8">
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-heading">Tu nombre y apellido</span>
        <input
          className="app-input w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Juan Pérez"
          required
          maxLength={120}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-heading">Tu URL pública</span>
        <div className="flex items-stretch overflow-hidden rounded-md border border-black/[0.08] bg-white">
          <span className="flex select-none items-center bg-page px-3 font-mono text-xs text-muted">
            tarjetas.app/
          </span>
          <input
            className="w-full bg-transparent px-3 py-2 font-mono text-sm focus:outline-none"
            value={handle}
            onChange={(e) =>
              setHandle(e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
            placeholder="juan-perez"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
          />
        </div>
        <span className="text-xs text-muted">
          Si está ocupado te sugerimos uno con un número al final.
        </span>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-heading">Email</span>
        <input
          className="app-input w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          type="email"
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
        {loading ? "Creando…" : "Crear mi tarjeta gratis"}
      </button>

      <p className="text-center text-xs text-muted">
        Empezás en plan Gratis (1 enlace de WhatsApp). Podés mejorar a Pro cuando quieras
        para sumar IA, redes y branding completo.
      </p>

      <div className="flex justify-between text-sm">
        <Link className="app-link" href="/login">
          Ya tengo cuenta
        </Link>
        <Link className="app-link" href="/register">
          Soy una empresa
        </Link>
      </div>
    </form>
  );
}
