import { describe, expect, it } from "vitest";
import { createProductSchema, updateProductSchema } from "@/lib/validations/product";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("createProductSchema", () => {
  it("accepts full valid input", () => {
    const r = createProductSchema.safeParse({
      name: "Refrigerante lata",
      categoryId: VALID_UUID,
      unit: "UNIT",
      averageCost: 4.5,
      salePrice: 8.0,
      minimumStock: 24,
    });
    expect(r.success).toBe(true);
  });

  it("accepts minimal valid input (name + categoryId)", () => {
    const r = createProductSchema.safeParse({
      name: "Sal",
      categoryId: VALID_UUID,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.unit).toBe("UNIT");
      expect(r.data.averageCost).toBe(0);
      expect(r.data.minimumStock).toBe(0);
    }
  });

  it("accepts null salePrice", () => {
    const r = createProductSchema.safeParse({
      name: "Sal",
      categoryId: VALID_UUID,
      salePrice: null,
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty name", () => {
    const r = createProductSchema.safeParse({ name: "", categoryId: VALID_UUID });
    expect(r.success).toBe(false);
  });

  it("rejects invalid categoryId", () => {
    const r = createProductSchema.safeParse({ name: "x", categoryId: "not-a-uuid" });
    expect(r.success).toBe(false);
  });

  it("rejects negative averageCost", () => {
    const r = createProductSchema.safeParse({
      name: "x",
      categoryId: VALID_UUID,
      averageCost: -1,
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative salePrice", () => {
    const r = createProductSchema.safeParse({
      name: "x",
      categoryId: VALID_UUID,
      salePrice: -1,
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid unit", () => {
    const r = createProductSchema.safeParse({
      name: "x",
      categoryId: VALID_UUID,
      unit: "INVALID",
    });
    expect(r.success).toBe(false);
  });

  it("accepts all valid units", () => {
    const units = ["UNIT", "KG", "G", "L", "ML", "PACKAGE", "BOX"] as const;
    for (const unit of units) {
      const r = createProductSchema.safeParse({ name: "x", categoryId: VALID_UUID, unit });
      expect(r.success).toBe(true);
    }
  });
});

describe("updateProductSchema", () => {
  it("accepts partial update", () => {
    const r = updateProductSchema.safeParse({ salePrice: 12.5 });
    expect(r.success).toBe(true);
  });

  it("accepts empty object", () => {
    const r = updateProductSchema.safeParse({});
    expect(r.success).toBe(true);
  });
});
