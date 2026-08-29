import type { NextAuthConfig } from "next-auth";

/**
 * Config compatible con Edge (proxy): sin Prisma ni bcrypt.
 * La instancia completa con Credentials vive en `auth.ts`.
 */

/**
 * En el preview de v0 la app se sirve dentro de un iframe cross-site sobre
 * HTTPS. Las cookies por defecto de Auth.js usan `SameSite=Lax`, así que la
 * cookie CSRF no se reenvía en ese contexto de terceros y el login falla con
 * "MissingCSRF". Cuando `AUTH_IFRAME_COOKIES=true` (solo en el preview, vía
 * `.env.local`), forzamos `SameSite=None; Secure` para que las cookies viajen
 * dentro del iframe. En local (Docker/localhost) esta bandera no existe y el
 * comportamiento por defecto se mantiene intacto.
 */
const iframeCookies = process.env.AUTH_IFRAME_COOKIES === "true";
const crossSiteOptions = {
  httpOnly: true,
  sameSite: "none",
  path: "/",
  secure: true,
} as const;

const authConfig = {
  trustHost: true,
  ...(iframeCookies
    ? {
        cookies: {
          sessionToken: { name: "authjs.session-token", options: crossSiteOptions },
          csrfToken: { name: "authjs.csrf-token", options: crossSiteOptions },
          callbackUrl: { name: "authjs.callback-url", options: crossSiteOptions },
          pkceCodeVerifier: { name: "authjs.pkce.code_verifier", options: crossSiteOptions },
          state: { name: "authjs.state", options: crossSiteOptions },
          nonce: { name: "authjs.nonce", options: crossSiteOptions },
        },
      }
    : {}),
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
