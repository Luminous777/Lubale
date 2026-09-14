/**
 * Lógica de restablecimiento de contraseña.
 *
 * Seguridad:
 * - Solo se guarda el hash SHA-256 del token; el valor plano viaja únicamente
 *   en el enlace del email.
 * - Enumeración: `requestPasswordReset` siempre resuelve igual, exista o no el
 *   email, para no revelar qué direcciones están registradas.
 * - El token es de un solo uso (`usedAt`) y vence a los 30 minutos.
 * - Al cambiar la contraseña se invalidan el resto de tokens de reset de ese
 *   email.
 */
import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { sendPasswordReset } from '@/lib/email';
import { getBaseUrl } from '@/lib/baseUrl';

const TOKEN_TTL_MS = 30 * 60_000; // 30 minutos
const MAX_REQUESTS_PER_WINDOW = 4;
const REQUEST_WINDOW_MS = 15 * 60_000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Genera y envía un enlace de reset. Siempre resuelve (no revela si el email existe). */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!/\S+@\S+\.\S+/.test(email)) return;

  // Límite por email para evitar spam / abuso.
  const recent = await prisma.passwordResetToken.count({
    where: { email, createdAt: { gt: new Date(Date.now() - REQUEST_WINDOW_MS) } },
  });
  if (recent >= MAX_REQUESTS_PER_WINDOW) return;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return; // silencio: no confirmamos existencia

  // Invalida tokens anteriores sin usar.
  await prisma.passwordResetToken.updateMany({
    where: { email, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString('base64url');
  await prisma.passwordResetToken.create({
    data: {
      email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const url = `${getBaseUrl()}/restablecer?token=${token}`;
  await sendPasswordReset({ to: email, url });
}

export type ResetResult = { ok: true } | { ok: false; error: string };

/** Valida el token y actualiza la contraseña. */
export async function resetPassword(token: string, newPassword: string): Promise<ResetResult> {
  if (!token) return { ok: false, error: 'Enlace inválido.' };
  if (newPassword.length < 8 || newPassword.length > 128) {
    return { ok: false, error: 'La contraseña debe tener entre 8 y 128 caracteres.' };
  }

  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!record) return { ok: false, error: 'El enlace venció o ya fue usado. Pedí uno nuevo.' };

  const user = await prisma.user.findUnique({ where: { email: record.email }, select: { id: true } });
  if (!user) return { ok: false, error: 'Enlace inválido.' };

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    // Marca este token como usado e invalida cualquier otro pendiente del mismo email.
    prisma.passwordResetToken.updateMany({
      where: { email: record.email, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
