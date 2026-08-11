import NextAuth from "next-auth";
import authConfig from "./auth.config";

/**
 * Proxy en Edge: solo usa `authConfig` (sin Prisma).
 * Ver https://authjs.dev/guides/edge-compatibility
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/dashboard") && !req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }
  return undefined;
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
