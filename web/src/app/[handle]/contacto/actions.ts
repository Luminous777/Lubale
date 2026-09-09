'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sendOwnerLeadEmail, sendCardToVisitor } from '@/lib/email';

type Input = {
  profileId: string;
  name:      string;
  email:     string;
  phone?:    string;
  company?:  string;
  note?:     string;
  wantsCard: boolean;
};

// Rate limit simple en memoria (no persiste entre instancias en producción)
const seen = new Map<string, number>();

export async function submitLead(input: Input): Promise<{ ok: boolean; error?: string }> {
  const name  = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (name.length < 2 || !/\S+@\S+\.\S+/.test(email)) {
    return { ok: false, error: 'Revisá el nombre y el email.' };
  }

  const ip  = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'anon';
  const key = `${ip}:${input.profileId}`;
  const last = seen.get(key) ?? 0;
  if (Date.now() - last < 20_000) {
    return { ok: false, error: 'Ya enviaste tus datos hace un momento.' };
  }
  seen.set(key, Date.now());

  // Profile con la org y sus admins para notificación
  const profile = await prisma.profile.findUnique({
    where: { id: input.profileId },
    include: {
      organization: {
        include: {
          memberships: {
            where:   { role: 'admin', status: 'active' },
            include: { user: true },
          },
        },
      },
    },
  });
  if (!profile || profile.status !== 'active') {
    return { ok: false, error: 'Esta tarjeta no está disponible.' };
  }

  const lead = await prisma.lead.create({
    data: {
      profileId: profile.id,
      name,
      email,
      phone:     input.phone?.trim()             || null,
      company:   input.company?.trim()           || null,
      note:      input.note?.trim().slice(0, 200) || null,
      wantsCard: input.wantsCard,
      status:    'nuevo',
    },
  });

  // Notificaciones no bloquean el submit: si fallan, el lead ya está guardado
  await Promise.allSettled([
    sendOwnerLeadEmail({ profile, lead }),
    input.wantsCard ? sendCardToVisitor({ profile, to: email }) : Promise.resolve(),
  ]);

  return { ok: true };
}
