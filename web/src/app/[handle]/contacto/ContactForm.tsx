"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Field = {
  key: "name" | "email" | "phone" | "company";
  label: string;
  placeholder: string;
  type?: string;
  autoComplete?: string;
};

const FIELDS: Field[] = [
  { key: "name",    label: "Nombre y apellido", placeholder: "Mariano Gómez",                 autoComplete: "name"    },
  { key: "email",   label: "Email",             placeholder: "mariano@constructoradelta.com",  type: "email",  autoComplete: "email"   },
  { key: "phone",   label: "Teléfono",          placeholder: "+54 9 11 …",                    type: "tel",    autoComplete: "tel"     },
  { key: "company", label: "Empresa",           placeholder: "Constructora Delta",             autoComplete: "organization" },
];

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ContactForm({
  profileId,
  ownerName,
  ownerRole,
  ownerSlug,
}: {
  profileId: string;
  ownerName: string;
  ownerRole: string;
  ownerSlug: string;
}) {
  const router = useRouter();
  const [form, setForm]         = useState({ name: "", email: "", phone: "", company: "" });
  const [note, setNote]         = useState("");
  const [wantsCard, setWantsCard] = useState(true);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");

  const valid = form.name.trim().length > 1 && form.email.includes("@");
  const firstName = ownerName.split(" ")[0];
  const mono = initials(ownerName);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/profile/${profileId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, note: note || undefined, wantsCard }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Error al enviar");
      }
      // Navegamos a /enviado con datos del formulario en la query
      const q = new URLSearchParams({
        ownerName,
        ownerSlug,
        leadName:    form.name,
        leadEmail:   form.email,
        leadCompany: form.company,
      });
      router.replace(`/enviado?${q}`);
    } catch (e: any) {
      setError(e.message ?? "No se pudo enviar. Intentá de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero navy */}
      <div className="px-7 pb-6 pt-10" style={{ backgroundColor: "#13263F" }}>
        <Link
          href={`/${ownerSlug}`}
          className="mb-5 block text-sm"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          ← Volver
        </Link>

        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base text-white"
            style={{ border: "1px solid rgba(255,255,255,0.3)", fontFamily: "Georgia, serif", letterSpacing: "0.05em" }}
          >
            {mono}
          </div>
          <div>
            <p className="text-lg text-white" style={{ fontFamily: "Georgia, serif" }}>{ownerName}</p>
            {ownerRole && (
              <p className="text-xs tracking-widest" style={{ color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                {ownerRole}
              </p>
            )}
          </div>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
          Dejame tus datos y te escribo. No se comparten con nadie más.
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={submit} className="px-7 py-6 flex flex-col gap-4">
        {FIELDS.map(f => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label
              htmlFor={f.key}
              className="text-xs tracking-widest"
              style={{ color: "#8A94A2", textTransform: "uppercase", letterSpacing: "0.18em" }}
            >
              {f.label}
            </label>
            <input
              id={f.key}
              type={f.type ?? "text"}
              autoComplete={f.autoComplete}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className="h-12 w-full rounded-xl border px-4 text-sm outline-none focus:border-[#13263F]"
              style={{ borderColor: "rgba(19,38,63,0.16)", color: "#13263F", fontSize: "15px" }}
            />
          </div>
        ))}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="note"
            className="text-xs tracking-widest"
            style={{ color: "#8A94A2", textTransform: "uppercase", letterSpacing: "0.18em" }}
          >
            Nota (opcional)
          </label>
          <textarea
            id="note"
            rows={3}
            placeholder="Nos conocimos en…"
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#13263F] resize-none"
            style={{ borderColor: "rgba(19,38,63,0.16)", color: "#13263F", fontSize: "15px" }}
          />
        </div>

        {/* Checkbox */}
        <label className="flex cursor-pointer items-start gap-3">
          <div
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded"
            style={{
              backgroundColor: wantsCard ? "#13263F" : "transparent",
              border: `1px solid ${wantsCard ? "#13263F" : "rgba(19,38,63,0.16)"}`,
            }}
            onClick={() => setWantsCard(v => !v)}
          >
            {wantsCard && <span className="text-xs text-white leading-none">✓</span>}
          </div>
          <input
            type="checkbox"
            checked={wantsCard}
            onChange={e => setWantsCard(e.target.checked)}
            className="sr-only"
          />
          <span className="text-xs leading-relaxed" style={{ color: "#6B7787" }}>
            Quiero recibir la tarjeta de {firstName} por email.
          </span>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={!valid || sending}
          className="mt-2 h-13 w-full rounded-xl text-base font-medium text-white transition-opacity disabled:opacity-35"
          style={{ backgroundColor: "#13263F", height: "52px" }}
        >
          {sending ? "Enviando…" : "Enviar mis datos"}
        </button>

        <p className="text-center text-xs" style={{ color: "#A6AEB9" }}>
          Protegido por LUBELA · lubela.app/{ownerSlug}
        </p>
      </form>
    </div>
  );
}
