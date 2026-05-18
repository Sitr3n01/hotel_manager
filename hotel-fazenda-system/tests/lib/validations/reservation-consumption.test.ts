import { describe, expect, it } from "vitest";
import { createConsumptionSchema } from "@/lib/validations/reservation-consumption";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("createConsumptionSchema", () => {
  it("accepts valid input with product", () => {
    const r = createConsumptionSchema.safeParse({
      reservationId: VALID_UUID,
      productId: VALID_UUID,
      description: "Refrigerante lata",
      quantity: 2,
      unitPrice: 8.0,
    });
    expect(r.success).toBe(true);
  });

  it("accepts valid input without product (free-form line)", () => {
    const r = createConsumptionSchema.safeParse({
      reservationId: VALID_UUID,
      description: "Suco natural especial",
      quantity: 1,
      unitPrice: 10.0,
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty description", () => {
    const r = createConsumptionSchema.safeParse({
      reservationId: VALID_UUID,
      description: "",
      quantity: 1,
      unitPrice: 5,
    });
    expect(r.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const r = createConsumptionSchema.safeParse({
      reservationId: VALID_UUID,
      description: "Refri",
      quantity: 0,
      unitPrice: 5,
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative unit price", () => {
    const r = createConsumptionSchema.safeParse({
      reservationId: VALID_UUID,
      description: "Refri",
      quantity: 1,
      unitPrice: -1,
    });
    expect(r.success).toBe(false);
  });

  it("accepts zero unit price (cortesia)", () => {
    const r = createConsumptionSchema.safeParse({
      reservationId: VALID_UUID,
      description: "Cortesia da casa",
      quantity: 1,
      unitPrice: 0,
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid reservation UUID", () => {
    const r = createConsumptionSchema.safeParse({
      reservationId: "not-a-uuid",
      description: "Refri",
      quantity: 1,
      unitPrice: 5,
    });
    expect(r.success).toBe(false);
  });
});
