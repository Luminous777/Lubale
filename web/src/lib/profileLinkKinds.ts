/**
 * Valores iguales al enum Prisma `ProfileLinkKind`.
 * Definidos aquí (sin `@prisma/client`) para que código usado por Client Components
 * no cargue Prisma en el navegador.
 */
export const ProfileLinkKind = {
  whatsapp: "whatsapp",
  email: "email",
  phone: "phone",
  web: "web",
  social: "social",
  other: "other",
} as const;

export type ProfileLinkKind = (typeof ProfileLinkKind)[keyof typeof ProfileLinkKind];
