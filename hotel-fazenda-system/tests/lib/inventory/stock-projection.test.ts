import { describe, expect, it } from "vitest";
import {
  projectStockAfterMovement,
  willStockGoNegative,
} from "@/lib/inventory/stock-projection";

describe("projectStockAfterMovement", () => {
  it("adds quantity for IN", () => {
    expect(projectStockAfterMovement(5, "IN", 10).toString()).toBe("15");
  });

  it("adds quantity for POSITIVE_ADJUSTMENT", () => {
    expect(projectStockAfterMovement(10, "POSITIVE_ADJUSTMENT", 3).toString()).toBe("13");
  });

  it("subtracts quantity for WASTE", () => {
    expect(projectStockAfterMovement(10, "WASTE", 3).toString()).toBe("7");
  });

  it("subtracts quantity for RESERVATION_CONSUMPTION", () => {
    expect(projectStockAfterMovement(10, "RESERVATION_CONSUMPTION", 2).toString()).toBe("8");
  });

  it("subtracts quantity for INTERNAL_CONSUMPTION", () => {
    expect(projectStockAfterMovement(10, "INTERNAL_CONSUMPTION", 1).toString()).toBe("9");
  });

  it("subtracts quantity for NEGATIVE_ADJUSTMENT", () => {
    expect(projectStockAfterMovement(10, "NEGATIVE_ADJUSTMENT", 5).toString()).toBe("5");
  });

  it("allows result to go below zero (warning, not block)", () => {
    expect(projectStockAfterMovement(5, "WASTE", 10).toString()).toBe("-5");
  });

  it("preserves decimal precision (kg)", () => {
    expect(projectStockAfterMovement("10.500", "WASTE", "0.250").toString()).toBe("10.25");
  });

  it("throws on negative quantity", () => {
    expect(() => projectStockAfterMovement(10, "IN", -1)).toThrow(
      "Quantidade não pode ser negativa",
    );
  });
});

describe("willStockGoNegative", () => {
  it("returns true when WASTE exceeds current stock", () => {
    expect(willStockGoNegative(5, "WASTE", 10)).toBe(true);
  });

  it("returns false when WASTE equals current stock (becomes 0)", () => {
    expect(willStockGoNegative(5, "WASTE", 5)).toBe(false);
  });

  it("returns false for IN (always additive)", () => {
    expect(willStockGoNegative(0, "IN", 100)).toBe(false);
  });

  it("returns false for POSITIVE_ADJUSTMENT", () => {
    expect(willStockGoNegative(0, "POSITIVE_ADJUSTMENT", 5)).toBe(false);
  });

  it("returns true when starting from negative", () => {
    expect(willStockGoNegative(-1, "WASTE", 1)).toBe(true);
  });
});
