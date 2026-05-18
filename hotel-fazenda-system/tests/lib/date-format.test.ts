import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateRange,
  formatIsoDate,
  parseIsoDate,
  toDateOnly,
} from "@/lib/date-format";

describe("formatDate", () => {
  it("formata data em dd/MM/yyyy", () => {
    expect(formatDate(new Date("2026-05-17T12:00:00"))).toBe("17/05/2026");
  });

  it("aceita string ISO", () => {
    expect(formatDate("2026-12-25T00:00:00")).toBe("25/12/2026");
  });

  it("retorna string vazia para null/undefined", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("retorna string vazia para data inválida", () => {
    expect(formatDate("not-a-date")).toBe("");
  });
});

describe("formatDateRange", () => {
  it("formata início – fim", () => {
    const start = new Date("2026-05-20T00:00:00");
    const end = new Date("2026-05-23T00:00:00");
    expect(formatDateRange(start, end)).toBe("20/05/2026 – 23/05/2026");
  });

  it("retorna apenas início quando fim é null", () => {
    expect(formatDateRange(new Date("2026-05-20T00:00:00"), null)).toBe("20/05/2026");
  });

  it("retorna string vazia quando ambos são null", () => {
    expect(formatDateRange(null, null)).toBe("");
  });
});

describe("formatIsoDate", () => {
  it("formata em yyyy-MM-dd", () => {
    expect(formatIsoDate(new Date("2026-05-17T15:30:00"))).toBe("2026-05-17");
  });
});

describe("parseIsoDate", () => {
  it("parseia yyyy-MM-dd válido", () => {
    const parsed = parseIsoDate("2026-05-17");
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(4);
    expect(parsed?.getDate()).toBe(17);
  });

  it("retorna null para string vazia", () => {
    expect(parseIsoDate("")).toBeNull();
  });

  it("retorna null para formato inválido", () => {
    expect(parseIsoDate("17/05/2026")).toBeNull();
    expect(parseIsoDate("invalid")).toBeNull();
  });
});

describe("toDateOnly", () => {
  it("zera componente de horário", () => {
    const date = new Date("2026-05-17T15:30:45.123");
    const dateOnly = toDateOnly(date);
    expect(dateOnly.getHours()).toBe(0);
    expect(dateOnly.getMinutes()).toBe(0);
    expect(dateOnly.getSeconds()).toBe(0);
    expect(dateOnly.getMilliseconds()).toBe(0);
  });

  it("não muta o input", () => {
    const date = new Date("2026-05-17T15:30:00");
    toDateOnly(date);
    expect(date.getHours()).toBe(15);
  });
});
