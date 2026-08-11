import type { NextAuthConfig } from "next-auth";

/**
 * Config compatible con Edge (proxy): sin Prisma ni bcrypt.
 * La instancia completa con Credentials vive en `auth.ts`.
 */
const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
