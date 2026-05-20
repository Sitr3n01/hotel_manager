import "server-only";

type RateLimitBucket = {
  tokens: number;
  lastRefill: number;
  expiresAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 10_000;

// Token Bucket in-memory por chave. Premissas:
//
// - Estado por-processo. Em deploy multi-instancia (Vercel serverless,
//   horizontal scale) cada instancia tem seu proprio Map; o limite
//   efetivo e N x limite. Para enforcement global, migrar para Upstash
//   ou Vercel KV.
// - A confiabilidade da chave depende do caller. Para chaves derivadas
//   de IP, usar getRequestIp() em lib/request-ip.ts que tem trust-proxy
//   documentado.
// - Eviction lazy: quando o Map atinge MAX_BUCKETS, fazemos sweep
//   removendo entries com expiresAt < now. Sem timer ativo para
//   preservar CPU idle.
export function rateLimit(key: string, limit: number, refillRatePerSec: number): boolean {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) evictStaleBuckets(now);

  // TTL do bucket: dobro do tempo de refill completo (0 -> limit). Apos
  // esse periodo o bucket esta com tokens cheios; descarta-lo nao muda
  // semantica.
  const expiresAt = now + (limit / refillRatePerSec) * 1000 * 2;

  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: limit, lastRefill: now, expiresAt };
  } else {
    const elapsedSec = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(limit, bucket.tokens + elapsedSec * refillRatePerSec);
    bucket.lastRefill = now;
    bucket.expiresAt = expiresAt;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return true;
  }

  buckets.set(key, bucket);
  return false;
}

function evictStaleBuckets(now: number): number {
  let removed = 0;
  for (const [key, bucket] of buckets) {
    if (bucket.expiresAt < now) {
      buckets.delete(key);
      removed += 1;
    }
  }
  return removed;
}

// Helpers de teste. Nao usar em codigo de aplicacao.
export function _bucketsSize(): number {
  return buckets.size;
}

export function _resetBuckets(): void {
  buckets.clear();
}
