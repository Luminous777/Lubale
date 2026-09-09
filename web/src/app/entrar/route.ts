// app/entrar/route.ts — link del email aterriza acá
import { createHash } from 'crypto';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) redirect('/login?error=link');

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const record = await prisma.magicToken.findFirst({
    where: {
      tokenHash,
      usedAt:    null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) redirect('/login?error=expirado');

  const user = await prisma.user.findUnique({
    where:   { email: record.email },
    include: {
      memberships: {
        where:   { status: 'active' },
        include: { organization: true },
        take:    1,
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!user) redirect('/login?error=link');

  // Marca el token como usado (no puede reutilizarse)
  await prisma.magicToken.update({
    where: { id: record.id },
    data:  { usedAt: new Date() },
  });

  // Crea la cookie de sesión NextAuth (JWT)
  await createSession(user.id);

  const org = user.memberships[0]?.organization;
  redirect(org ? `/dashboard/${org.slug}` : '/onboarding');
}
