"use client";

import { useId, useRef, useState } from "react";

type UploadKind = "org-logo" | "org-card-bg" | "profile-photo" | "profile-card-bg";

type Props = {
  name: string;
  label: string;
  /** Valor inicial del campo URL (servidor). */
  defaultValue?: string;
  orgSlug: string;
  uploadKind: UploadKind;
  /** Si se edita una tarjeta existente, restringe permisos correctamente en el servidor. */
  profileId?: string;
  placeholder?: string;
  hint?: string;
};

export function ImageUrlWithUpload({
  name,
  label,
  defaultValue = "",
  orgSlug,
  uploadKind,
  profileId,
  placeholder = "https://… o sube una imagen abajo",
  hint,
}: Props) {
  const id = useId();
  const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(defaultValue.trim() || "");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMessage(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("kind", uploadKind);
      fd.append("orgSlug", orgSlug);
      if (profileId) fd.append("profileId", profileId);
      fd.append("file", file);

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen");

      const url = data.url;
      if (!url) throw new Error("Respuesta inválida del servidor");

      if (urlRef.current) {
        urlRef.current.value = url;
        urlRef.current.dispatchEvent(new Event("input", { bubbles: true }));
        urlRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
      setPreview(url);
      setUploadMessage("Imagen subida. Puedes guardar el formulario.");
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-heading" id={`${id}-label`}>
        {label}
      </span>
      <input
        ref={urlRef}
        id={`${id}-url`}
        name={name}
        type="text"
        defaultValue={defaultValue}
        className="app-input w-full"
        placeholder={placeholder}
        aria-labelledby={`${id}-label`}
      />
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={onFileChange}
          aria-label="Elegir imagen del equipo"
        />
        <button
          type="button"
          className="app-btn-secondary h-9 px-4 text-sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Subiendo…" : "Elegir imagen…"}
        </button>
        {uploadMessage ? (
          <span
            className={
              uploadMessage.includes("subida") || uploadMessage.includes("guardar")
                ? "text-xs text-muted"
                : "text-xs text-red-700"
            }
          >
            {uploadMessage}
          </span>
        ) : null}
      </div>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- URLs dinámicas usuario/CDN
        <img
          src={preview}
          alt=""
          className={`mt-2 w-auto max-w-full rounded-lg border border-black/[0.06] object-contain ${
            uploadKind === "org-logo" ? "h-28" : "h-24"
          }`}
        />
      ) : null}
    </div>
  );
}
