"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { resetPasswordAction } from "./actions";

export function RestablecerForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const res = await resetPasswordAction(token, password);
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login?reset=ok"), 1500);
  }

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-6 py-12">
        <div className="app-card flex flex-col gap-4 p-8">
          <h1 className="text-xl font-semibold text-heading">Contraseña actualizada</h1>
          <p className="text-sm text-muted">
            Tu contraseña se cambió correctamente. Te llevamos a iniciar sesión…
          </p>
          <Link className="app-btn-primary mt-2 w-full text-center" href="/login">
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-heading">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-muted">Elegí una contraseña segura para tu cuenta.</p>
      </div>

      <form onSubmit={onSubmit} className="app-card flex flex-col gap-4 p-8">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Nueva contraseña</span>
          <input
            className="app-input w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Repetir contraseña</span>
          <input
            className="app-input w-full"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="app-btn-primary mt-2 w-full" type="submit" disabled={loading}>
          {loading ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
