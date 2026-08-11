type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();
let lastCleanup = Date.now();

function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, w] of store) {
    if (w.resetAt < now) store.delete(key);
  }
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  maybeCleanup();
  const now = Date.now();
  const w = store.get(key);

  if (!w || w.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (w.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((w.resetAt - now) / 1000) };
  }

  w.count++;
  return { ok: true };
}

export function rateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "Demasiados intentos. Esperá un momento e intentá de nuevo." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
