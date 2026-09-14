'use server';

import { requestPasswordReset } from '@/lib/passwordReset';

/**
 * Pide un enlace de restablecimiento. Devuelve siempre `{ ok: true }` para no
 * revelar si el email está registrado (protección contra enumeración).
 */
export async function requestResetAction(email: string): Promise<{ ok: true }> {
  await requestPasswordReset(email);
  return { ok: true };
}
