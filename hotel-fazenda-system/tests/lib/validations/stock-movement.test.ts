import { describe, expect, it } from "vitest";
import {
  adjustmentSchema,
  internalConsumptionSchema,
  purchaseSchema,
  wasteSchema,
} from "@/lib/validations/stock-movement";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("purchaseSchema", () => {
  it("accepts single-item purchase", () => {
    const r = purchaseSchema.safeParse({
      items: [{ productId: VALID_UUID, quantity: 10, totalCost: 70 }],
    });
    expect(r.success).toBe(true);
  });

  it("accepts multi-item purchase", () => {
    const r = purchaseSchema.safeParse({
      items: [
        { productId: VALID_UUID, quantity: 10, totalCost: 70 },
        { productId: VALID_UUID, quantity: 5, totalCost: 35 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const r = purchaseSchema.safeParse({ items: [] });
    expect(r.success).toBe(false);
  });

  it("rejects more than 50 items", () => {
    const items = Array.from({ length: 51 }, () => ({
      productId: VALID_UUID,
      quantity: 1,
      totalCost: 1,
    }));
    const r = purchaseSchema.safeParse({ items });
    expect(r.success).toBe(false);
  });

  it("rejects zero quantity in item", () => {
    const r = purchaseSchema.safeParse({
      items: [{ productId: VALID_UUID, quantity: 0, totalCost: 10 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative total cost", () => {
    const r = purchaseSchema.safeParse({
      items: [{ productId: VALID_UUID, quantity: 1, totalCost: -1 }],
    });
    expect(r.success).toBe(false);
  });

  it("accepts zero total cost (free sample)", () => {
    const r = purchaseSchema.safeParse({
      items: [{ productId: VALID_UUID, quantity: 1, totalCost: 0 }],
    });
    expect(r.success).toBe(true);
  });
});

describe("wasteSchema", () => {
  it("accepts valid waste with reason", () => {
    const r = wasteSchema.safeParse({
      productId: VALID_UUID,
      quantity: 0.5,
      reason: "Produto vencido",
    });
    expect(r.success).toBe(true);
  });

  it("rejects waste without reason", () => {
    const r = wasteSchema.safeParse({ productId: VALID_UUID, quantity: 0.5 });
    expect(r.success).toBe(false);
  });

  it("rejects empty reason", () => {
    const r = wasteSchema.safeParse({
      productId: VALID_UUID,
      quantity: 0.5,
      reason: "",
    });
    expect(r.success).toBe(false);
  });

  it("rejects reason shorter than 3 chars", () => {
    const r = wasteSchema.safeParse({
      productId: VALID_UUID,
      quantity: 0.5,
      reason: "ab",
    });
    expect(r.success).toBe(false);
  });
});

describe("internalConsumptionSchema", () => {
  it("accepts without reason", () => {
    const r = internalConsumptionSchema.safeParse({
      productId: VALID_UUID,
      quantity: 1,
    });
    expect(r.success).toBe(true);
  });

  it("accepts with reason", () => {
    const r = internalConsumptionSchema.safeParse({
      productId: VALID_UUID,
      quantity: 1,
      reason: "Almoço da equipe",
    });
    expect(r.success).toBe(true);
  });

  it("rejects zero quantity", () => {
    const r = internalConsumptionSchema.safeParse({
      productId: VALID_UUID,
      quantity: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe("adjustmentSchema", () => {
  it("accepts POSITIVE adjustment with reason", () => {
    const r = adjustmentSchema.safeParse({
      productId: VALID_UUID,
      quantity: 1,
      direction: "POSITIVE",
      reason: "Recontagem física: sobrou",
    });
    expect(r.success).toBe(true);
  });

  it("accepts NEGATIVE adjustment with reason", () => {
    const r = adjustmentSchema.safeParse({
      productId: VALID_UUID,
      quantity: 1,
      direction: "NEGATIVE",
      reason: "Recontagem física: faltou",
    });
    expect(r.success).toBe(true);
  });

  it("rejects without direction", () => {
    const r = adjustmentSchema.safeParse({
      productId: VALID_UUID,
      quantity: 1,
      reason: "Recontagem física",
    });
    expect(r.success).toBe(false);
  });

  it("rejects without reason", () => {
    const r = adjustmentSchema.safeParse({
      productId: VALID_UUID,
      quantity: 1,
      direction: "POSITIVE",
    });
    expect(r.success).toBe(false);
  });
});
