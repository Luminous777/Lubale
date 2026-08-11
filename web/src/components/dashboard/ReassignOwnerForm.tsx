"use client";

import { useActionState } from "react";
import type { ReassignOwnerFormState } from "@/server/profile";
import { reassignProfileOwnerFormAction } from "@/server/profile";

type Props = { orgSlug: string; profileId: string };

export function ReassignOwnerForm({ orgSlug, profileId }: Props) {
  const [state, formAction, pending] = useActionState<ReassignOwnerFormState, FormData>(
    reassignProfileOwnerFormAction.bind(null, orgSlug, profileId),
    undefined,
  );

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      {state?.error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
          <span className="font-medium text-heading">Email del nuevo propietario</span>
          <input name="newOwnerEmail" type="email" required className="app-input w-full" />
        </label>
        <button type="submit" className="app-btn-secondary h-11 shrink-0 px-5 text-sm" disabled={pending}>
          {pending ? "…" : "Reasignar"}
        </button>
      </div>
    </form>
  );
}
