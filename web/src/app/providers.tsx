"use client";

/**
 * No usamos `SessionProvider` de next-auth/react: la app resuelve toda la
 * autorización del lado del servidor con `auth()`, y en el cliente solo se
 * usan `signIn`/`signOut`, que funcionan sin contexto de sesión. Montar el
 * SessionProvider rompía el prerender estático (hace fetch de sesión con
 * useState en un contexto sin dispatcher). Este wrapper queda como punto de
 * extensión para futuros providers de cliente.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
