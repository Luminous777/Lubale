export function absoluteUrl(path: string) {
  const base =
    process.env.APP_BASE_URL?.replace(/\/$/, "") ??
    process.env.AUTH_URL?.replace(/\/$/, "") ??
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
}

export function publicCardPath(orgSlug: string, cardSlug: string) {
  return `/card/${orgSlug}/${cardSlug}`;
}
