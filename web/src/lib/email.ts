/**
 * @/lib/email — stub de envío de emails
 *
 * TODO: implementar con Resend / Nodemailer / SES.
 * Por ahora las funciones loguean en dev y no hacen nada en prod,
 * para que el lead se guarde sin romper si el email falla.
 */

import type { Profile, Organization, Membership, User, Lead } from '@prisma/client';

type ProfileWithOrg = Profile & {
  organization: Organization & {
    memberships: (Membership & { user: User })[];
  };
};

/** Notifica al dueño de la tarjeta que recibió un nuevo lead. */
export async function sendOwnerLeadEmail({
  profile,
  lead,
}: {
  profile: ProfileWithOrg;
  lead: Lead;
}): Promise<void> {
  // TODO: enviar email al admin de la org
  // Destinatario: profile.organization.memberships[0].user.email
  // Asunto: `Nuevo contacto: ${lead.name}`
  if (process.env.NODE_ENV === 'development') {
    console.log('[email] sendOwnerLeadEmail', { to: profile.organization.name, lead: lead.name });
  }
}

/** Envía el magic link para autenticación sin contraseña. */
export async function sendMagicLink({
  to,
  url,
}: {
  to: string;
  url: string;
}): Promise<void> {
  // TODO: enviar email con el link de acceso (15 min de validez)
  // Asunto: "Tu link para entrar a Lubela"
  // Cuerpo: botón "Entrar a Lubela" → url
  if (process.env.NODE_ENV === 'development') {
    console.log('[email] sendMagicLink', { to, url });
  }
}

/** Envía el link de invitación a un nuevo miembro del equipo. */
export async function sendInviteEmail({
  to,
  orgName,
  url,
}: {
  to: string;
  orgName: string;
  url: string;
}): Promise<void> {
  // TODO: enviar email de invitación al equipo
  // Asunto: `Te invitaron a ${orgName} en Lubela`
  // Cuerpo: botón "Aceptar invitación" → url (válido 7 días)
  if (process.env.NODE_ENV === 'development') {
    console.log('[email] sendInviteEmail', { to, orgName, url });
  }
}

/** Envía la vCard del dueño al email del visitante cuando wantsCard === true. */
export async function sendCardToVisitor({
  profile,
  to,
}: {
  profile: ProfileWithOrg;
  to: string;
}): Promise<void> {
  // TODO: generar vCard con buildVCard() de @/lib/vcard y adjuntarla al email
  if (process.env.NODE_ENV === 'development') {
    console.log('[email] sendCardToVisitor', { to, from: profile.displayName });
  }
}
