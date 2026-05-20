import { describe, expect, it, beforeEach, vi } from "vitest";

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: headersMock }));

import { getRequestIp } from "@/lib/request-ip";

function mockHeaders(entries: Record<string, string>): void {
  const map = new Map(Object.entries(entries));
  headersMock.mockResolvedValue({
    get: (key: string) => map.get(key.toLowerCase()) ?? null,
  });
}

describe("getRequestIp", () => {
  beforeEach(() => {
    headersMock.mockReset();
  });

  it("prioriza x-vercel-forwarded-for sobre os demais headers", async () => {
    mockHeaders({
      "x-vercel-forwarded-for": "1.2.3.4",
      "cf-connecting-ip": "5.6.7.8",
      "x-forwarded-for": "evil.example, 10.0.0.1",
      "x-real-ip": "9.10.11.12",
    });
    expect(await getRequestIp()).toBe("1.2.3.4");
  });

  it("usa cf-connecting-ip quando x-vercel-forwarded-for ausente", async () => {
    mockHeaders({
      "cf-connecting-ip": "5.6.7.8",
      "x-forwarded-for": "evil.example",
    });
    expect(await getRequestIp()).toBe("5.6.7.8");
  });

  it("extrai primeiro segmento de x-forwarded-for", async () => {
    mockHeaders({ "x-forwarded-for": "9.10.11.12, 10.0.0.1, 172.16.0.1" });
    expect(await getRequestIp()).toBe("9.10.11.12");
  });

  it("usa x-real-ip como ultimo recurso antes do fallback", async () => {
    mockHeaders({ "x-real-ip": "13.14.15.16" });
    expect(await getRequestIp()).toBe("13.14.15.16");
  });

  it("retorna 'unknown' quando nenhum header esta presente", async () => {
    mockHeaders({});
    expect(await getRequestIp()).toBe("unknown");
  });

  it("retorna 'unknown' quando headers() lanca", async () => {
    headersMock.mockRejectedValue(new Error("no request context"));
    expect(await getRequestIp()).toBe("unknown");
  });
});
