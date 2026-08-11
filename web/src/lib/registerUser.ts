import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
}) {
  const email = input.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { ok: false as const, error: "Ese email ya está registrado" };
  }
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name?.trim() || null,
    },
  });
  return { ok: true as const, userId: user.id };
}
