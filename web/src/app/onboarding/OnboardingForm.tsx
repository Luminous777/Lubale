"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createOrganizationAction } from "@/server/org";

type State =
  | null
  | { error: string }
  | { ok: true; slug: string };

export function OnboardingForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (_prev: State, formData: FormData) => {
      return (await createOrganizationAction(null, formData)) as State;
    },
    null,
  );

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      router.push(`/dashboard/${state.slug}`);
      router.refresh();
    }
  }, [router, state]);

  return (
    <form action={formAction} className="app-card flex flex-col gap-4 p-8">
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-heading">Nombre de la empresa</span>
        <input
          name="name"
          className="app-input w-full"
          placeholder="ACME Concesionaria"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-heading">Identificador (URL)</span>
        <input name="slug" className="app-input w-full font-mono text-sm" placeholder="acme" required />
        <span className="text-xs text-muted">
          Quedará como <span className="font-mono">/card/&lt;identificador&gt;/…</span>
        </span>
      </label>
      {state && "error" in state ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button className="app-btn-primary mt-2 w-full" type="submit" disabled={pending}>
        {pending ? "Creando…" : "Continuar"}
      </button>
      <Link className="text-center text-sm text-muted underline-offset-4 transition hover:text-heading" href="/dashboard">
        Volver
      </Link>
    </form>
  );
}
