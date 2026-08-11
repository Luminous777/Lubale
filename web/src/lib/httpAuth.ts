import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";

export async function getBearerUser(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  const token = match[1];
  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true },
  });
  if (!user) return null;
  return user;
}
