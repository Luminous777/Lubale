'use client';

import { useState, useTransition } from 'react';
import { changeSeats } from './actions';

export default function SeatManager({
  orgSlug,
  seats,
  used,
  unitPrice,
}: {
  orgSlug: string;
  seats: number;
  used: number;
  unitPrice: number;
}) {
  const [next, setNext] = useState(seats);
  const [pending, start] = useTransition();

  const delta     = next - seats;
  const canRemove = next > Math.max(1, used);

  return (
    <section
      id="asientos"
      className="flex items-center justify-between gap-6 rounded-2xl bg-bone px-6 py-5"
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[14.5px] font-medium">Asientos del equipo</h2>
        <p className="text-[13px] text-muted">
          {used} en uso de {seats} · cada asiento extra {`$${unitPrice.toLocaleString('es-AR')}`}/mes
        </p>
      </div>

      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2.5 rounded-[11px] border border-navy/[0.16] bg-white px-2 py-1.5">
          <button
            onClick={() => canRemove && setNext(n => n - 1)}
            disabled={!canRemove}
            className="grid size-8 place-items-center rounded-lg text-lg text-muted disabled:opacity-30"
          >
            −
          </button>
          <span className="w-8 text-center font-serif text-xl">{next}</span>
          <button
            onClick={() => setNext(n => n + 1)}
            className="grid size-8 place-items-center rounded-lg text-lg text-muted"
          >
            +
          </button>
        </div>

        {delta !== 0 && (
          <>
            <span className="text-[12.5px] text-muted">
              {delta > 0 ? '+' : '−'}
              {`$${(Math.abs(delta) * unitPrice).toLocaleString('es-AR')}`}/mes
            </span>
            <button
              onClick={() => start(() => changeSeats({ orgSlug, seats: next }))}
              disabled={pending}
              className="rounded-[11px] bg-navy px-[18px] py-3 text-[13.5px] text-white disabled:opacity-50"
            >
              {pending ? 'Aplicando…' : 'Confirmar'}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
