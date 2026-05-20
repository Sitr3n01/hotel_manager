import "server-only";

type RateLimitBucket = {
  tokens: number;
  lastRefill: number;
};

const buckets = new Map<string, RateLimitBucket>();

/**
 * Limita a taxa de requisições baseando-se no algoritmo de Token Bucket.
 * 
 * @param key Identificador único para o bucket (ex: IP + Ação ou ID + Ação).
 * @param limit Capacidade máxima do bucket (número de requisições permitidas consecutivamente).
 * @param refillRatePerSec Taxa na qual os tokens são regenerados por segundo.
 * @returns boolean Retorna true se a requisição for permitida; false se for bloqueada.
 */
export function rateLimit(key: string, limit: number, refillRatePerSec: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: limit, lastRefill: now };
  } else {
    const elapsedSec = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(limit, bucket.tokens + elapsedSec * refillRatePerSec);
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return true; // Permitido
  }

  buckets.set(key, bucket);
  return false; // Bloqueado por limite de taxa
}
