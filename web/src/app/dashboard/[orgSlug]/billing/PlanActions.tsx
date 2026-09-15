'use client';

import { useState, useTransition } from 'react';
import { cancelSubscriptionAction } from '@/server/billing';

const VARIANTS = {
  white: 'bg-white text-navy font-medium',
  gold:  'border border-gold text-gold',
  ghost: 'border border-white/[0.24] text-white/70',
} as const;

export default function PlanActions({
  orgSlug,
  label,
  variant,
  cancel,
}: {
  orgSlug: string;
  /** Compat: ya no se usa, el plan se elige en el formulario. */
  plan?: string;
  label: string;
  variant: keyof typeof VARIANTS;
  cancel?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  // Botones que no cancelan (cambiar plan, activar, actualizar pago) llevan al
  // formulario unificado de cambio de plan que vive más abajo en la página.
  if (!cancel) {
    return (
      <a
        href="#cambiar-plan"
        className={`inline-flex items-center rounded-[11px] px-[18px] py-3 text-[13.5px] ${VARIANTS[variant]}`}
      >
        {label}
      </a>
    );
  }

  const run = () =>
    start(async () => {
      await cancelSubscriptionAction({ orgSlug });
      setConfirm(false);
    });

  if (!confirm)
    return (
      <button
        onClick={() => setConfirm(true)}
        className={`rounded-[11px] px-[18px] py-3 text-[13.5px] ${VARIANTS[variant]}`}
      >
        {label}
      </button>
    );

  return (
    <span className="flex items-center gap-2 text-[12.5px] text-white/70">
      <span>¿Seguro?</span>
      <button onClick={run} disabled={pending} className="rounded-lg bg-white px-3 py-2 text-navy disabled:opacity-50">
        {pending ? '…' : 'Sí, cancelar'}
      </button>
      <button onClick={() => setConfirm(false)} className="px-2 py-2">
        No
      </button>
    </span>
  );
}
