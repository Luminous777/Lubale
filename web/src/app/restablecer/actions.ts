'use server';

import { resetPassword, type ResetResult } from '@/lib/passwordReset';

export async function resetPasswordAction(
  token: string,
  password: string,
): Promise<ResetResult> {
  return resetPassword(token, password);
}
