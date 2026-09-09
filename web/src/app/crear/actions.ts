'use server';

import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { RESERVED_HANDLES } from '@/lib/handles';
import { sendMagicLink } from '@/lib/email';

export async function checkSlug(slug: string): Promise<boolean> {
  if (RESERVED_HANDLES.has(slug)) return false;
  const [profile, org] = await Promise.all([
    prisma.profile.findFirst({ where: { cardSlug: slug }, select: { id: true } }),
    prisma.organization.findUnique({ where: { slug }, select: { id: true } }),
  ]);
  return !profile && !org;
}

export async function claimCard(input: {
  name:    string;
  email:   string;
  company: string;
  slug:    string;
  trial:   boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.trim().toLowerCase();
  const name  = input.name.trim();
  const slug  = input.slug.trim();

  if (name.length < 2 || !/\S+@\S+\.\S+/.test(email) || slug.length < 3) {
    return { ok: false, error: 'Revisá los datos.' };
  }
  if (!(await checkSlug(slug))) {
    return { ok: false, error: 'Ese link ya está tomado.' };
  }

  // Si el email ya existe → magic link directo (ya tiene cuenta)
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await issueMagicLink(email);
    return { ok: true };
  }

  const now = new Date();
  const trialEnd = input.trial ? new Date(now.getTime() + 30 * 86_400_000) : null;

  await prisma.$transaction(async tx => {
    // passwordHash requerido en el schema; los usuarios de magic link usan un valor random.
    // No se usa para login — la auth es por magic link / JWT.
    const user = await tx.user.create({
      data: {
        email,
        name,
        passwordHash: randomBytes(32).toString('hex'),
      },
    });

    const org = await tx.organization.create({
      data: {
        slug,
        name:            input.company.trim() || name,
        kind:            'personal',
        plan:            input.trial ? 'pro' : 'free',
        seats:           1,
        billingStatus:   input.trial ? 'trialing' : 'none',
        inTrial:         input.trial,
        currentPeriodEnd: trialEnd,
        primaryColor:    '#13263F',
        secondaryColor:  '#3C5A80',
      },
    });

    await tx.membership.create({
      data: {
        userId:         user.id,
        organizationId: org.id,
        role:           'admin',
        status:         'active',
      },
    });

    await tx.profile.create({
      data: {
        organizationId: org.id,
        ownerUserId:    user.id,
        cardSlug:       slug,
        displayName:    name,
        status:         'active',
      },
    });
  });

  await issueMagicLink(email);
  return { ok: true };
}

async function issueMagicLink(email: string) {
  const token = randomBytes(32).toString('base64url');
  await prisma.magicToken.create({
    data: {
      email,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 15 * 60_000), // 15 min
    },
  });
  // Universal link: si tiene la app abre autenticado; si no, cae en la web
  await sendMagicLink({ to: email, url: `https://lubela.app/entrar?token=${token}` });
}
