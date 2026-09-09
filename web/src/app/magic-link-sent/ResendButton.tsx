'use client';

import { useEffect, useState, useTransition } from 'react';
import { resendMagicLink } from './actions';

const COOLDOWN = 45;

export default function ResendButton({ email }: { email: string }) {
  const [left, setLeft] = useState(COOLDOWN);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  if (!email) return null;

  const onClick = () =>
    start(async () => {
      await resendMagicLink(email);
      setSent(true);
      setLeft(COOLDOWN);
      setTimeout(() => setSent(false), 4000);
    });

  return (
    <button
      onClick={onClick}
      disabled={left > 0 || pending}
      className="transition hover:text-white/80 disabled:cursor-default disabled:hover:text-white/50"
    >
      {sent ? 'Link reenviado ✓' : left > 0 ? `Reenviar el link (${left}s)` : 'Reenviar el link'}
    </button>
  );
}
