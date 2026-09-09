'use client';

import { useState, useTransition } from 'react';
import { startCheckout, cancelSubscription } from './actions';

const VARIANTS = {
  white: 'bg-white text-navy font-medium',
  gold:  'border border-gold text-gold',
  ghost: 'border border-white/[0.24] text-white/70',
} as const;

export default function PlanActions({
  orgSlug,
  plan,
  label,
  variant,
  cancel,
}: {
  orgSlug: string;
  plan: string;
  label: string;
  variant: keyof typeof VARIANTS;
  cancel?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      if (cancel) {
        await cancelSubscription({ orgSlug });
        setConfirm(false);
        return;
      }
      const res = await startCheckout({ orgSlug, targetPlan: plan === 'free' ? 'pro' : plan });
      if (res.url) window.location.href = res.url;
    });

  if (cancel && !confirm)
    return (
      <button
        onClick={() => setConfirm(true)}
        className={`rounded-[11px] px-[18px] py-3 text-[13.5px] ${VARIANTS[variant]}`}
      >
        {label}
      </button>
    );

  if (cancel)
    return (
      <span className="flex items-center gap-2 text-[12.5px] text-white/70">
        <span>¿Seguro?</span>
        <button onClick={run} disabled={pending} className="rounded-lg bg-white px-3 py-2 text-navy">
          {pending ? '…' : 'Sí, cancelar'}
        </button>
        <button onClick={() => setConfirm(false)} className="px-2 py-2">
          No
        </button>
      </span>
    );

  return (
    <button
      onClick={run}
      disabled={pending}
      className={`rounded-[11px] px-[18px] py-3 text-[13.5px] disabled:opacity-50 ${VARIANTS[variant]}`}
    >
      {pending ? 'Redirigiendo…' : label}
    </button>
  );
}
