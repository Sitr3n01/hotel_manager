import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import {
  calculateNights,
  calculateDailyTotal,
  calculateConsumptionTotal,
  calculateFinalTotal,
  formatCurrency,
} from "@/lib/financial-calculations";

// ---------------------------------------------------------------------------
// calculateNights
// ---------------------------------------------------------------------------

describe("calculateNights", () => {
  it("calcula 2 noites: check-in 2026-05-10, check-out 2026-05-12", () => {
    const result = calculateNights(
      new Date("2026-05-10"),
      new Date("2026-05-12"),
    );
    expect(result).toBe(2);
  });

  it("calcula 1 noite: check-in 2026-05-10, check-out 2026-05-11", () => {
    const result = calculateNights(
      new Date("2026-05-10"),
      new Date("2026-05-11"),
    );
    expect(result).toBe(1);
  });

  it("retorna 0 para day-use (mesma data, sem pernoite)", () => {
    const result = calculateNights(
      new Date("2026-05-10T10:00:00"),
      new Date("2026-05-10T18:00:00"),
    );
    expect(result).toBe(0);
  });

  it("lança erro quando check-out é antes do check-in", () => {
    expect(() =>
      calculateNights(new Date("2026-05-12"), new Date("2026-05-10")),
    ).toThrow("Check-out deve ser posterior ao check-in");
  });

  it("calcula 365 noites para reserva de 1 ano", () => {
    const result = calculateNights(
      new Date("2026-01-01"),
      new Date("2027-01-01"),
    );
    // 2026 has 365 days
    expect(result).toBe(365);
  });
});

// ---------------------------------------------------------------------------
// calculateDailyTotal
// ---------------------------------------------------------------------------

describe("calculateDailyTotal", () => {
  it("3 noites × R$200.00 = R$600.00", () => {
    const result = calculateDailyTotal(3, new Prisma.Decimal("200.00"));
    expect(result.equals(new Prisma.Decimal("600.00"))).toBe(true);
  });

  it("0 noites × R$200.00 = R$0.00", () => {
    const result = calculateDailyTotal(0, new Prisma.Decimal("200.00"));
    expect(result.equals(new Prisma.Decimal("0.00"))).toBe(true);
  });

  it("2 noites × R$199.90 = R$399.80", () => {
    const result = calculateDailyTotal(2, new Prisma.Decimal("199.90"));
    expect(result.equals(new Prisma.Decimal("399.80"))).toBe(true);
  });

  it("5 noites × R$150.75 = R$753.75", () => {
    const result = calculateDailyTotal(5, new Prisma.Decimal("150.75"));
    expect(result.equals(new Prisma.Decimal("753.75"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateConsumptionTotal
// ---------------------------------------------------------------------------

describe("calculateConsumptionTotal", () => {
  it("soma 3 itens: R$50 + R$30 + R$20 = R$100", () => {
    const items = [
      { quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(50) },
      { quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(30) },
      { quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(20) },
    ];
    const result = calculateConsumptionTotal(items);
    expect(result.equals(new Prisma.Decimal(100))).toBe(true);
  });

  it("array vazio retorna R$0", () => {
    const result = calculateConsumptionTotal([]);
    expect(result.equals(new Prisma.Decimal(0))).toBe(true);
  });

  it("quantidade 2 × R$15.50 = R$31.00", () => {
    const items = [
      { quantity: new Prisma.Decimal(2), unitPrice: new Prisma.Decimal("15.50") },
    ];
    const result = calculateConsumptionTotal(items);
    expect(result.equals(new Prisma.Decimal("31.00"))).toBe(true);
  });

  it("item único: 1 × R$99.90 = R$99.90", () => {
    const items = [
      { quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal("99.90") },
    ];
    const result = calculateConsumptionTotal(items);
    expect(result.equals(new Prisma.Decimal("99.90"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateFinalTotal
// ---------------------------------------------------------------------------

describe("calculateFinalTotal", () => {
  it("caso feliz: 1000 + 200 − 100 + 50 = 1150", () => {
    const result = calculateFinalTotal(
      new Prisma.Decimal(1000),
      new Prisma.Decimal(200),
      new Prisma.Decimal(100),
      new Prisma.Decimal(50),
    );
    expect(result.equals(new Prisma.Decimal(1150))).toBe(true);
  });

  it("sem desconto nem acréscimo: 800 + 200 = 1000", () => {
    const result = calculateFinalTotal(
      new Prisma.Decimal(800),
      new Prisma.Decimal(200),
      new Prisma.Decimal(0),
      new Prisma.Decimal(0),
    );
    expect(result.equals(new Prisma.Decimal(1000))).toBe(true);
  });

  it("desconto maior que o total: clamp para 0", () => {
    const result = calculateFinalTotal(
      new Prisma.Decimal(200),
      new Prisma.Decimal(50),
      new Prisma.Decimal(1000), // desconto > total
      new Prisma.Decimal(0),
    );
    expect(result.equals(new Prisma.Decimal(0))).toBe(true);
  });

  it("desconto exatamente igual ao total: retorna 0", () => {
    const result = calculateFinalTotal(
      new Prisma.Decimal(500),
      new Prisma.Decimal(0),
      new Prisma.Decimal(500),
      new Prisma.Decimal(0),
    );
    expect(result.equals(new Prisma.Decimal(0))).toBe(true);
  });

  it("só diárias, sem consumo: 500 + 0 = 500", () => {
    const result = calculateFinalTotal(
      new Prisma.Decimal(500),
      new Prisma.Decimal(0),
      new Prisma.Decimal(0),
      new Prisma.Decimal(0),
    );
    expect(result.equals(new Prisma.Decimal(500))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe("formatCurrency", () => {
  it("1500 → R$ 1.500,00", () => {
    expect(formatCurrency(new Prisma.Decimal(1500))).toBe("R$\xA01.500,00");
  });

  it("0 → R$ 0,00", () => {
    expect(formatCurrency(new Prisma.Decimal(0))).toBe("R$\xA00,00");
  });

  it("99.90 → R$ 99,90", () => {
    expect(formatCurrency(new Prisma.Decimal("99.90"))).toBe("R$\xA099,90");
  });

  it("1234567.89 → R$ 1.234.567,89", () => {
    expect(formatCurrency(new Prisma.Decimal("1234567.89"))).toBe(
      "R$\xA01.234.567,89",
    );
  });
});
