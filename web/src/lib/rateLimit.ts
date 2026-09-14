/**
 * Rate limiting con Upstash Redis (store compartido).
 *
 * El límite anterior vivía en un Map en memoria: en serverless cada instancia
 * tenía su propio contador y el límite se reiniciaba en cada deploy, así que no
 * frenaba ataques de fuerza bruta reales. Con Redis el contador es global.
 *
 * La API pública (`checkRateLimit`, `rateLimitResponse`, `getClientIp`) se
 * mantiene; solo `checkRateLimit` pasó a ser asíncrona. Si Redis no está
 * configurado (p. ej. build local sin credenciales) se permite el paso para no
 * bloquear el desarrollo — nunca se debe fallar abierto en producción, por eso
 * las credenciales están presentes en el entorno desplegado.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;

const redis =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// Un limiter por combinación (límite, ventana). Se cachean para reutilizar conexión.
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const cacheKey = `${limit}:${windowSec}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: "rl",
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const limiter = getLimiter(limit, windowMs);
  if (!limiter) return { ok: true }; // sin Redis (dev): no bloquear

  const { success, reset } = await limiter.limit(key);
  if (success) return { ok: true };

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return { ok: false, retryAfter };
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
