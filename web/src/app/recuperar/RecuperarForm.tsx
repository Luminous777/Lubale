"use client";

import Link from "next/link";
import { useState } from "react";
import { requestResetAction } from "./actions";

export function RecuperarForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await requestResetAction(email);
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-heading">
          Recuperar contraseña
        </h1>
        <p className="mt-2 text-sm text-muted">
          Ingresá tu email y te enviaremos un enlace para elegir una nueva contraseña.
        </p>
      </div>

      {sent ? (
        <div className="app-card flex flex-col gap-4 p-8">
          <p className="text-sm text-heading">
            Si hay una cuenta asociada a <strong>{email}</strong>, te enviamos un enlace para
            restablecer la contraseña. Revisá tu bandeja de entrada y la carpeta de spam.
          </p>
          <p className="text-sm text-muted">El enlace vence en 30 minutos.</p>
          <Link className="app-btn-primary mt-2 w-full text-center" href="/login">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="app-card flex flex-col gap-4 p-8">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-heading">Email</span>
            <input
              className="app-input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <button className="app-btn-primary mt-2 w-full" type="submit" disabled={loading}>
            {loading ? "Enviando…" : "Enviar enlace"}
          </button>
          <p className="text-center text-sm text-muted">
            <Link className="app-link font-medium" href="/login">
              Volver a iniciar sesión
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
