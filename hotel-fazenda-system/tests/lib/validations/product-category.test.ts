import { describe, expect, it } from "vitest";
import {
  createProductCategorySchema,
  updateProductCategorySchema,
} from "@/lib/validations/product-category";

describe("createProductCategorySchema", () => {
  it("accepts valid input", () => {
    const r = createProductCategorySchema.safeParse({ name: "Bebidas", description: "Sucos e refris" });
    expect(r.success).toBe(true);
  });

  it("accepts input without description", () => {
    const r = createProductCategorySchema.safeParse({ name: "Bebidas" });
    expect(r.success).toBe(true);
  });

  it("accepts empty string description", () => {
    const r = createProductCategorySchema.safeParse({ name: "Bebidas", description: "" });
    expect(r.success).toBe(true);
  });

  it("rejects empty name", () => {
    const r = createProductCategorySchema.safeParse({ name: "" });
    expect(r.success).toBe(false);
  });

  it("rejects name longer than 100", () => {
    const r = createProductCategorySchema.safeParse({ name: "a".repeat(101) });
    expect(r.success).toBe(false);
  });

  it("rejects description longer than 500", () => {
    const r = createProductCategorySchema.safeParse({ name: "x", description: "a".repeat(501) });
    expect(r.success).toBe(false);
  });
});

describe("updateProductCategorySchema", () => {
  it("accepts partial update (only name)", () => {
    const r = updateProductCategorySchema.safeParse({ name: "Limpeza" });
    expect(r.success).toBe(true);
  });

  it("accepts empty object", () => {
    const r = updateProductCategorySchema.safeParse({});
    expect(r.success).toBe(true);
  });
});
