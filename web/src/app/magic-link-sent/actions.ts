'use server';

import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendMagicLink } from '@/lib/email';

export async function resendMagicLink(rawEmail: string): Promise<{ ok: true }> {
  const email = rawEmail.trim().toLowerCase();
  if (!/\S+@\S+\.\S+/.test(email)) return { ok: true };

  // Rate limit: máximo 4 tokens en los últimos 10 minutos
  const recent = await prisma.magicToken.count({
    where: { email, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } },
  });
  if (recent >= 4) return { ok: true }; // silencio: no revelamos nada

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { ok: true }; // no confirmamos si el email existe

  // Invalida los tokens anteriores sin usar
  await prisma.magicToken.updateMany({
    where: { email, usedAt: null },
    data:  { usedAt: new Date() },
  });

  const token = randomBytes(32).toString('base64url');
  await prisma.magicToken.create({
    data: {
      email,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 15 * 60_000),
    },
  });

  await sendMagicLink({ to: email, url: `https://lubela.app/entrar?token=${token}` });
  return { ok: true };
}
