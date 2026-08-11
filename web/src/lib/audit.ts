import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logAudit(input: {
  organizationId: string;
  actorUserId: string;
  action: string;
  payload?: Record<string, unknown>;
}) {
  const payload =
    input.payload === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(input.payload)) as Prisma.InputJsonValue);

  await prisma.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      payload,
    },
  });
}
