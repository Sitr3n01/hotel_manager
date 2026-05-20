import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _bucketsSize, _resetBuckets, rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetBuckets();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite requisições dentro do limite da capacidade do bucket", () => {
    const key = "test-limit";
    // 3 requests allowed, refills at 1 token every 10 seconds (0.1 / sec)
    expect(rateLimit(key, 3, 0.1)).toBe(true);
    expect(rateLimit(key, 3, 0.1)).toBe(true);
    expect(rateLimit(key, 3, 0.1)).toBe(true);
    expect(rateLimit(key, 3, 0.1)).toBe(false); // Exceeded
  });

  it("recupera tokens gradualmente conforme o tempo passa (refill rate)", () => {
    const key = "test-refill";
    
    // Consumir todos os 2 tokens
    expect(rateLimit(key, 2, 0.5)).toBe(true);
    expect(rateLimit(key, 2, 0.5)).toBe(true);
    expect(rateLimit(key, 2, 0.5)).toBe(false); // Esgotado

    // Avançar o tempo em 2 segundos (refill rate = 0.5/sec -> deve regenerar 1 token)
    vi.advanceTimersByTime(2000);

    expect(rateLimit(key, 2, 0.5)).toBe(true); // Permitido (1 token regenerado)
    expect(rateLimit(key, 2, 0.5)).toBe(false); // Esgotado novamente
  });

  it("não ultrapassa o limite máximo de tokens do bucket", () => {
    const key = "test-max-capacity";

    // Consumir 1 token de um bucket de 2
    expect(rateLimit(key, 2, 0.5)).toBe(true);

    // Avançar tempo o suficiente para transbordar
    vi.advanceTimersByTime(10000); // 10s * 0.5 = 5 novos tokens (mas limite é 2)

    expect(rateLimit(key, 2, 0.5)).toBe(true);
    expect(rateLimit(key, 2, 0.5)).toBe(true);
    expect(rateLimit(key, 2, 0.5)).toBe(false); // Clampado em 2 tokens
  });

  it("separa buckets baseando-se em chaves diferentes", () => {
    const keyA = "key-a";
    const keyB = "key-b";

    expect(rateLimit(keyA, 1, 1)).toBe(true);
    expect(rateLimit(keyA, 1, 1)).toBe(false); // Esgotado para A

    expect(rateLimit(keyB, 1, 1)).toBe(true); // Ainda permitido para B
  });

  it("evicta buckets stale lazy quando o Map ultrapassa 10k entries", () => {
    // Popular 10001 buckets com TTL curto (refill 1/s, limit 1 -> TTL = 2s)
    for (let i = 0; i < 10_001; i += 1) {
      rateLimit(`stale-${i}`, 1, 1);
    }
    expect(_bucketsSize()).toBe(10_001);

    // Avancar tempo alem do TTL de todos os buckets criados
    vi.advanceTimersByTime(5_000);

    // Proxima chamada (acima do threshold) dispara sweep e remove os
    // buckets expirados antes de criar o novo.
    rateLimit("trigger-sweep", 1, 1);

    // Sobrou apenas o novo bucket; os 10001 anteriores foram evictados.
    expect(_bucketsSize()).toBe(1);
  });
});
