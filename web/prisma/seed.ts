import { MembershipRole, MembershipStatus, ProfileStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma, disconnectPrisma } from "../src/lib/prisma";

async function main() {
  const email = "admin@example.com";
  const password = await bcrypt.hash("password123", 12);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Admin Demo",
      passwordHash: password,
    },
    update: {
      passwordHash: password,
      name: "Admin Demo",
    },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });

  const org = await prisma.organization.upsert({
    where: { slug: "acme" },
    create: {
      name: "ACME Concesionaria",
      slug: "acme",
      primaryColor: "#3f67c4",
      secondaryColor: "#6a8edc",
    },
    update: {
      name: "ACME Concesionaria",
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: MembershipRole.admin,
      status: MembershipStatus.active,
    },
    update: {
      role: MembershipRole.admin,
      status: MembershipStatus.active,
    },
  });

  const profile = await prisma.profile.upsert({
    where: {
      organizationId_cardSlug: {
        organizationId: org.id,
        cardSlug: "ventas-001",
      },
    },
    create: {
      organizationId: org.id,
      ownerUserId: user.id,
      cardSlug: "ventas-001",
      displayName: "María Ventas",
      title: "Asesora comercial",
      bio: "Te ayudo con tu próximo vehículo.",
      phone: "+34 600 000 000",
      emailPublic: "ventas@acme.example",
      status: ProfileStatus.active,
      links: {
        create: [
          { title: "WhatsApp", url: "https://wa.me/34600000000", sortOrder: 0 },
          { title: "Web ACME", url: "https://example.com", sortOrder: 1 },
        ],
      },
    },
    update: {
      displayName: "María Ventas",
      ownerUserId: user.id,
      status: ProfileStatus.active,
    },
  });

  await prisma.profile.upsert({
    where: {
      organizationId_cardSlug: {
        organizationId: org.id,
        cardSlug: "mostrador",
      },
    },
    create: {
      organizationId: org.id,
      cardSlug: "mostrador",
      displayName: "Mostrador",
      title: "Atención al cliente",
      phone: "+34 900 000 000",
      status: ProfileStatus.active,
    },
    update: {},
  });

  console.log("Seed OK:", { org: org.slug, profile: profile.cardSlug, user: email });
}

main()
  .then(async () => {
    await disconnectPrisma();
  })
  .catch(async (e) => {
    console.error(e);
    await disconnectPrisma();
    process.exit(1);
  });
