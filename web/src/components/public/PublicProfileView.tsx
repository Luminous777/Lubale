import Link from "next/link";
import { ProfileQr } from "@/components/ProfileQr";
import { buildPublicContactActions, ChannelGlyph } from "@/lib/contactChannels";

type LinkRow = { id: string; url: string; href?: string; title: string };

export type PublicProfileViewProps = {
  displayName: string;
  photoUrl: string | null;
  /** Fondo solo de esta tarjeta; si existe, sustituye al de la marca. */
  cardBackgroundUrl: string | null;
  /** Fondo por defecto de la organización (Marca); cubre toda la tarjeta si no hay `cardBackgroundUrl`. */
  organizationCardBackgroundUrl?: string | null;
  title: string | null;
  bio: string | null;
  phone: string | null;
  emailPublic: string | null;
  organizationName: string;
  organizationLogoUrl: string | null;
  links: LinkRow[];
  primary: string;
  secondary: string;
  cardUrl: string;
  vcardHref: string;
  /** `embed`: panel del dashboard (sin página completa ni QR real). */
  variant?: "public" | "embed";
};

const iconBtn =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-700 shadow-sm transition hover:scale-[1.06] hover:border-slate-300 hover:shadow-md active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

export function PublicProfileView({
  displayName,
  photoUrl,
  cardBackgroundUrl,
  organizationCardBackgroundUrl = null,
  title: jobTitle,
  bio,
  phone,
  emailPublic,
  organizationName,
  organizationLogoUrl,
  links,
  primary,
  secondary,
  cardUrl,
  vcardHref,
  variant = "public",
}: PublicProfileViewProps) {
  const embed = variant === "embed";
  const nameForInitial = displayName.trim() || "?";
  const initial = nameForInitial.slice(0, 1).toUpperCase();
  const effectiveBg =
    cardBackgroundUrl?.trim() || organizationCardBackgroundUrl?.trim() || null;
  const usePhotoBackdrop = Boolean(effectiveBg);

  const gradientStripStyle = !usePhotoBackdrop
    ? { background: `linear-gradient(135deg, ${primary}, ${secondary})` }
    : undefined;

  const photoRadius = embed ? "rounded-none" : "rounded-[2rem]";
  const photoBackdropLayers = usePhotoBackdrop ? (
    <>
      <div
        className={`pointer-events-none absolute inset-0 z-0 ${photoRadius}`}
        style={{
          backgroundImage: `url(${JSON.stringify(effectiveBg)})`,
          backgroundSize: "cover",
          backgroundPosition: "center 25%",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        className={`pointer-events-none absolute inset-0 z-[1] ${photoRadius}`}
        style={{
          /* Neutro (solo blanco/negro alpha): evita teñir la imagen vs el PNG. Slate #0f172a la desaturaba. */
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.05) 26%, rgba(255,255,255,0.12) 46%, rgba(255,255,255,0.78) 74%, rgba(255,255,255,0.94) 92%, rgba(255,255,255,0.97) 100%)",
        }}
      />
    </>
  ) : null;

  const contactActions = buildPublicContactActions({
    phone,
    emailPublic,
    links,
  });

  const cardRadius = embed ? "rounded-none" : "rounded-[2rem]";
  const cardShadow = embed
    ? "shadow-[0_6px_20px_-4px_rgba(0,0,0,0.12)]"
    : "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18)]";
  const card = (
    <div
      className={`w-full border border-black/[0.06] ${cardShadow} ${cardRadius} ${
        usePhotoBackdrop ? "relative overflow-hidden bg-slate-200" : "bg-white"
      } ${embed ? "mx-0 flex min-h-full max-w-none flex-col" : "mx-auto max-w-[420px]"}`}
    >
      {photoBackdropLayers}
      <div
        className={`relative isolate ${
          embed
            ? "z-[2] flex min-h-0 flex-1 flex-col"
            : usePhotoBackdrop
              ? "z-[2] min-h-[28rem] sm:min-h-[29rem]"
              : ""
        }`}
      >
        <div
          className={`relative h-36 w-full overflow-hidden sm:h-40 ${
            embed ? "rounded-t-none" : "rounded-t-[2rem]"
          } ${usePhotoBackdrop ? "bg-transparent" : ""}`}
          style={gradientStripStyle}
        >
          {organizationLogoUrl ? (
            <div className="absolute left-4 top-4 z-[5] max-w-[min(72%,16rem)] sm:left-5 sm:top-5 sm:max-w-[18rem]">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL pública usuario/CDN */}
              <img
                src={organizationLogoUrl}
                alt={organizationName}
                className="max-h-14 w-auto max-w-full rounded-2xl object-contain object-left drop-shadow-[0_2px_14px_rgba(0,0,0,0.25)] sm:max-h-16 sm:rounded-[1.35rem]"
              />
            </div>
          ) : null}
        </div>

        <div className="absolute left-1/2 top-36 z-10 flex w-full max-w-[calc(100%-1rem)] -translate-x-1/2 -translate-y-1/2 justify-center px-3 sm:top-40">
          <div className="pointer-events-auto rounded-full border-4 border-white bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.07]">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={displayName}
                width={160}
                height={160}
                decoding="async"
                className="aspect-square h-28 w-28 rounded-full object-cover object-center sm:h-[7.25rem] sm:w-[7.25rem]"
              />
            ) : (
              <div
                className="flex aspect-square h-28 w-28 items-center justify-center rounded-full text-2xl font-semibold sm:h-[7.25rem] sm:w-[7.25rem] sm:text-3xl"
                style={{
                  backgroundColor: `color-mix(in srgb, ${primary} 16%, white)`,
                  color: primary,
                }}
              >
                {initial}
              </div>
            )}
          </div>
        </div>

        <div
          className={`pb-6 pt-[5rem] sm:pt-[5.25rem] ${
            embed ? "flex min-h-0 flex-1 flex-col rounded-b-none px-3 sm:px-4" : "rounded-b-[2rem] px-5 sm:px-6"
          } ${usePhotoBackdrop ? "bg-transparent" : ""}`}
        >
          <h1 className="text-center text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {displayName.trim() || "Nombre visible"}
          </h1>
          {jobTitle ? (
            <p className="mt-1.5 text-center text-sm leading-snug text-slate-600">{jobTitle}</p>
          ) : null}
          <p className="mt-1 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            {organizationName}
          </p>

          {bio ? (
            <p className="mt-3 text-center text-sm leading-snug text-slate-600">{bio}</p>
          ) : null}

          {contactActions.length > 0 ? (
            <nav
              className="mt-6 flex w-full flex-wrap justify-center gap-2.5"
              aria-label="Contacto y redes"
            >
              {contactActions.map((a) => (
                <a
                  key={a.key}
                  href={a.href}
                  target={a.newTab ? "_blank" : undefined}
                  rel={a.newTab ? "noreferrer" : undefined}
                  className={iconBtn}
                  aria-label={a.ariaLabel}
                  title={a.ariaLabel}
                >
                  <ChannelGlyph kind={a.kind} className="h-5 w-5" />
                </a>
              ))}
            </nav>
          ) : null}

          {embed ? <div className="min-h-0 flex-1" aria-hidden /> : null}

          {embed ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-center">
              <p className="text-xs font-medium text-slate-600">Vista previa</p>
              <p className="mt-1 text-[11px] leading-snug text-slate-500">
                El código QR y el archivo .vcf estarán activos en la tarjeta publicada.
              </p>
              <p className="mt-2 break-all font-mono text-[10px] text-slate-400">{cardUrl}</p>
            </div>
          ) : (
            <div className="mt-6 w-full rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-semibold text-slate-800 sm:text-sm">Compartir (QR)</p>
                <ProfileQr url={cardUrl} showDownload />
                <p className="break-all text-center text-[11px] text-slate-500 sm:text-xs">{cardUrl}</p>
              </div>
            </div>
          )}

          {embed ? (
            <p className="mt-5 text-center text-xs text-slate-500">
              Los iconos de contacto abren los mismos enlaces que verá el visitante.
            </p>
          ) : (
            <div className="mt-5 flex w-full flex-col gap-2">
              <a
                href={vcardHref}
                className="text-center text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
              >
                Añadir a contactos (.vcf)
              </a>
              <Link
                href="/"
                className="text-center text-xs text-slate-500 transition hover:text-slate-800"
              >
                Crear tarjetas para tu empresa
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (embed) {
    return card;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-5 sm:py-7">
      {card}
    </div>
  );
}
