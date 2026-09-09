/**
 * @/lib/auth — helpers de sesión para magic link
 *
 * NextAuth usa JWT strategy (auth.config.ts). Podemos crear la sesión
 * directamente codificando el JWT y seteando la cookie — mismo resultado
 * que llamar a signIn(), sin necesidad de pasar por el formulario de login.
 */

import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME =
  process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

/**
 * Verifica que el usuario autenticado tenga una membresía activa en la org.
 * Devuelve { org, user, membership } o redirige/404 si no tiene acceso.
 * Incluye `_count.memberships` para que las páginas puedan mostrarlo.
 */
export async function requireMembership(orgSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      memberships: {
        where: { userId, status: 'active' },
      },
      _count: { select: { memberships: true } },
    },
  });

  if (!org || !org.memberships[0]) notFound();

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) redirect('/login');

  const membership = org.memberships[0];
  const isAdmin = membership.role === 'admin';

  return { org, user, membership, isAdmin };
}

/** Crea una sesión NextAuth para el userId dado, seteando la cookie JWT. */
export async function createSession(userId: string): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET no está configurado');

  const token = await encode({
    token:  { userId },
    secret,
    maxAge: SESSION_MAX_AGE,
  });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   SESSION_MAX_AGE,
  });
}
