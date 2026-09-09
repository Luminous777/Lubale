// app/api/leads/export/route.ts — CSV
import { prisma } from '@/lib/prisma';
import { requireMembership } from '@/lib/auth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgSlug = url.searchParams.get('org') ?? '';
  const estado  = url.searchParams.get('estado') ?? 'todos';
  const q       = url.searchParams.get('q') ?? '';

  const { org, isAdmin, user } = await requireMembership(orgSlug);

  const leads = await prisma.lead.findMany({
    where: {
      profile: { organizationId: org.id, ...(isAdmin ? {} : { ownerUserId: user.id }) },
      ...(estado !== 'todos' ? { status: estado } : {}),
      ...(q
        ? {
            OR: [
              { name:    { contains: q, mode: 'insensitive' } },
              { email:   { contains: q, mode: 'insensitive' } },
              { company: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { profile: { select: { displayName: true, cardSlug: true } } },
  });

  // el = adelante evita que Excel interprete fórmulas
  const cell = (v: string | null) =>
    `"${(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;

  const rows = [
    ['Nombre', 'Email', 'Teléfono', 'Empresa', 'Nota', 'Tarjeta', 'Link', 'Origen', 'Estado', 'Fecha'],
    ...leads.map(l => [
      l.name,
      l.email,
      l.phone,
      l.company,
      l.note,
      l.profile.displayName,
      `lubela.app/${l.profile.cardSlug}`,
      l.source ?? '',
      l.status,
      l.createdAt.toISOString(),
    ]),
  ]
    .map(r => r.map(c => cell(c as string | null)).join(','))
    .join('\r\n');

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response('﻿' + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="lubela-contactos-${stamp}.csv"`,
    },
  });
}
