/**
 * @/lib/email — envío de emails transaccionales con Resend.
 *
 * El SDK de Resend NO lanza excepciones: devuelve `{ data, error }`. Por eso
 * revisamos `error` explícitamente y nunca dejamos que un fallo de email rompa
 * el flujo que lo invoca (p. ej. guardar un lead). Los envíos usan idempotency
 * key para que un reintento no duplique el correo.
 */
import { Resend } from 'resend';
import type { Profile, Organization, Membership, User, Lead } from '@prisma/client';
import { getBaseUrl } from '@/lib/baseUrl';

type ProfileWithOrg = Profile & {
  organization: Organization & {
    memberships: (Membership & { user: User })[];
  };
};

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const FROM_DOMAIN = process.env.RESEND_EMAIL_DOMAIN;
const FROM = FROM_DOMAIN ? `Lubela <no-reply@${FROM_DOMAIN}>` : 'Lubela <onboarding@resend.dev>';

const isDev = process.env.NODE_ENV === 'development';

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
};

/** Envío central: seguro ante ausencia de credenciales y ante errores de API. */
async function send({ to, subject, html, idempotencyKey }: SendArgs): Promise<void> {
  if (!resend) {
    if (isDev) console.log('[email] (sin RESEND_API_KEY) simulado →', { to, subject });
    return;
  }

  const { error } = await resend.emails.send(
    { from: FROM, to: [to], subject, html },
    idempotencyKey ? { idempotencyKey } : undefined,
  );

  if (error) {
    console.error('[email] fallo al enviar', { to, subject, error: error.message });
  }
}

/** Layout HTML mínimo y consistente para todos los correos. */
function layout(opts: { heading: string; body: string; cta?: { label: string; url: string }; foot?: string }): string {
  const button = opts.cta
    ? `<a href="${opts.cta.url}" style="display:inline-block;background:#13263F;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:9999px;font-size:15px">${opts.cta.label}</a>`
    : '';
  const foot = opts.foot ?? 'Si no esperabas este correo, podés ignorarlo.';
  return `
  <div style="background:#F3F1EC;padding:32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #E7E4DC">
      <div style="font-size:20px;font-weight:700;color:#13263F;margin-bottom:8px">Lubela</div>
      <h1 style="font-size:18px;color:#13263F;margin:16px 0 8px">${opts.heading}</h1>
      <div style="font-size:15px;line-height:1.6;color:#45455c;margin-bottom:24px">${opts.body}</div>
      ${button}
      <p style="font-size:13px;color:#7b7b90;margin-top:24px">${foot}</p>
    </div>
  </div>`;
}

/** Notifica al dueño de la tarjeta que recibió un nuevo lead. */
export async function sendOwnerLeadEmail({
  profile,
  lead,
}: {
  profile: ProfileWithOrg;
  lead: Lead;
}): Promise<void> {
  const to = profile.organization.memberships[0]?.user.email;
  if (!to) return;

  const rows = [
    ['Nombre', lead.name],
    ['Email', lead.email],
    ['Teléfono', lead.phone],
    ['Empresa', lead.company],
    ['Nota', lead.note],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<p style="margin:4px 0"><strong>${k}:</strong> ${v}</p>`)
    .join('');

  await send({
    to,
    subject: `Nuevo contacto: ${lead.name}`,
    html: layout({
      heading: 'Recibiste un nuevo contacto',
      body: `Alguien dejó sus datos en tu tarjeta <strong>${profile.displayName}</strong>.${rows}`,
      foot: 'Podés ver todos tus contactos en el panel de Lubela.',
    }),
    idempotencyKey: `lead-notify/${lead.id}`,
  });
}

/** Envía el magic link para autenticación sin contraseña (15 min de validez). */
export async function sendMagicLink({ to, url }: { to: string; url: string }): Promise<void> {
  await send({
    to,
    subject: 'Tu enlace para entrar a Lubela',
    html: layout({
      heading: 'Entrá a tu cuenta',
      body: 'Hacé clic en el botón para iniciar sesión. El enlace vence en 15 minutos y solo puede usarse una vez.',
      cta: { label: 'Entrar a Lubela', url },
      foot: 'Si no pediste este enlace, podés ignorar este correo.',
    }),
  });
}

/** Envía el enlace para restablecer la contraseña (30 min de validez). */
export async function sendPasswordReset({ to, url }: { to: string; url: string }): Promise<void> {
  await send({
    to,
    subject: 'Restablecer tu contraseña de Lubela',
    html: layout({
      heading: 'Restablecer contraseña',
      body: 'Recibimos una solicitud para cambiar tu contraseña. Hacé clic en el botón para elegir una nueva. El enlace vence en 30 minutos y solo puede usarse una vez.',
      cta: { label: 'Cambiar contraseña', url },
      foot: 'Si no pediste esto, ignorá este correo: tu contraseña actual sigue siendo válida.',
    }),
  });
}

/** Envía el link de invitación a un nuevo miembro del equipo (válido 7 días). */
export async function sendInviteEmail({
  to,
  orgName,
  url,
}: {
  to: string;
  orgName: string;
  url: string;
}): Promise<void> {
  await send({
    to,
    subject: `Te invitaron a ${orgName} en Lubela`,
    html: layout({
      heading: `Unite a ${orgName}`,
      body: `Te invitaron a colaborar en <strong>${orgName}</strong> en Lubela. La invitación vence en 7 días.`,
      cta: { label: 'Aceptar invitación', url },
    }),
  });
}

/** Envía la tarjeta del dueño al email del visitante cuando wantsCard === true. */
export async function sendCardToVisitor({
  profile,
  to,
}: {
  profile: ProfileWithOrg;
  to: string;
}): Promise<void> {
  const url = `${getBaseUrl()}/${profile.cardSlug}`;
  await send({
    to,
    subject: `La tarjeta de ${profile.displayName}`,
    html: layout({
      heading: `Guardá el contacto de ${profile.displayName}`,
      body: 'Podés abrir la tarjeta y guardar el contacto en tu teléfono desde el botón.',
      cta: { label: 'Ver tarjeta', url },
      foot: 'Recibiste este correo porque lo solicitaste en la tarjeta.',
    }),
  });
}
