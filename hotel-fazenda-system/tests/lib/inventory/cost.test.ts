import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { calculateNewAverageCost, unitCostFromBatch } from "@/lib/inventory/cost";

describe("calculateNewAverageCost", () => {
  it("returns added unit cost when current stock is zero (first purchase)", () => {
    const result = calculateNewAverageCost(0, 0, 10, 5);
    expect(result.toString()).toBe("5");
  });

  it("computes weighted average for second purchase", () => {
    const result = calculateNewAverageCost(10, 5, 10, 10);
    expect(result.toString()).toBe("7.5");
  });

  it("handles fractional quantities (kg)", () => {
    const result = calculateNewAverageCost(
      new Prisma.Decimal("0.5"),
      new Prisma.Decimal("10"),
      new Prisma.Decimal("0.25"),
      new Prisma.Decimal("20"),
    );
    expect(result.toFixed(4)).toBe("13.3333");
  });

  it("preserves existing average when adding at same unit cost", () => {
    const result = calculateNewAverageCost(20, 7, 10, 7);
    expect(result.toString()).toBe("7");
  });

  it("throws when added quantity is zero", () => {
    expect(() => calculateNewAverageCost(10, 5, 0, 5)).toThrow(
      "Quantidade adicionada deve ser positiva",
    );
  });

  it("throws when added quantity is negative", () => {
    expect(() => calculateNewAverageCost(10, 5, -1, 5)).toThrow(
      "Quantidade adicionada deve ser positiva",
    );
  });

  it("throws when added unit cost is negative", () => {
    expect(() => calculateNewAverageCost(10, 5, 1, -1)).toThrow(
      "Custo unitário não pode ser negativo",
    );
  });

  it("accepts zero unit cost (free sample)", () => {
    const result = calculateNewAverageCost(10, 5, 10, 0);
    expect(result.toString()).toBe("2.5");
  });

  it("returns Prisma.Decimal", () => {
    const result = calculateNewAverageCost(0, 0, 1, 1);
    expect(result).toBeInstanceOf(Prisma.Decimal);
  });
});

describe("unitCostFromBatch", () => {
  it("divides total by quantity", () => {
    expect(unitCostFromBatch(70, 10).toString()).toBe("7");
  });

  it("handles fractional quantities", () => {
    expect(unitCostFromBatch(25, 5).toString()).toBe("5");
  });

  it("throws when quantity is zero", () => {
    expect(() => unitCostFromBatch(50, 0)).toThrow("Quantidade deve ser positiva");
  });

  it("throws when quantity is negative", () => {
    expect(() => unitCostFromBatch(50, -1)).toThrow("Quantidade deve ser positiva");
  });
});
