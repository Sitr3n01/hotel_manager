import { describe, it, expect } from "vitest";
import {
  financialClosingSchema,
  financialClosingServerSchema,
  reopenClosingSchema,
} from "@/lib/validations/financial-closing";

// ---------------------------------------------------------------------------
// financialClosingSchema (client-side)
// ---------------------------------------------------------------------------

describe("financialClosingSchema", () => {
  it("dados mínimos válidos passam", () => {
    const result = financialClosingSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: 0,
      extraTotal: 0,
      paymentStatus: "PENDING",
      paymentMethod: null,
    });
    expect(result.success).toBe(true);
  });

  it("todos os campos preenchidos passam", () => {
    const result = financialClosingSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: 50,
      extraTotal: 30,
      discountJustification: "Desconto promocional de fidelidade",
      extraJustification: "Serviço extra de lavanderia",
      paymentStatus: "PAID",
      paymentMethod: "PIX",
    });
    expect(result.success).toBe(true);
  });

  it("reservationId não-UUID falha", () => {
    const result = financialClosingSchema.safeParse({
      reservationId: "not-a-uuid",
      discountTotal: 0,
      extraTotal: 0,
      paymentStatus: "PENDING",
      paymentMethod: null,
    });
    expect(result.success).toBe(false);
  });

  it("desconto negativo falha", () => {
    const result = financialClosingSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: -10,
      extraTotal: 0,
      paymentStatus: "PENDING",
      paymentMethod: null,
    });
    expect(result.success).toBe(false);
  });

  it("acréscimo negativo falha", () => {
    const result = financialClosingSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: 0,
      extraTotal: -5,
      paymentStatus: "PENDING",
      paymentMethod: null,
    });
    expect(result.success).toBe(false);
  });

  it("paymentStatus inválido falha", () => {
    const result = financialClosingSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: 0,
      extraTotal: 0,
      paymentStatus: "INVALID_STATUS",
      paymentMethod: null,
    });
    expect(result.success).toBe(false);
  });

  it("paymentMethod inválido falha", () => {
    const result = financialClosingSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: 0,
      extraTotal: 0,
      paymentStatus: "PENDING",
      paymentMethod: "BITCOIN",
    });
    expect(result.success).toBe(false);
  });

  it("paymentMethod null é válido", () => {
    const result = financialClosingSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: 0,
      extraTotal: 0,
      paymentStatus: "PENDING",
      paymentMethod: null,
    });
    expect(result.success).toBe(true);
  });

  it("discountJustification > 500 caracteres falha", () => {
    const result = financialClosingSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: 0,
      extraTotal: 0,
      paymentStatus: "PENDING",
      paymentMethod: null,
      discountJustification: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// financialClosingServerSchema (superRefine)
// ---------------------------------------------------------------------------

describe("financialClosingServerSchema", () => {
  it("extraTotal > 0 sem extraJustification falha", () => {
    const result = financialClosingServerSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: 0,
      extraTotal: 50,
      paymentStatus: "PENDING",
      paymentMethod: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.path.join("."));
      expect(issues).toContain("extraJustification");
    }
  });

  it("extraTotal > 0 com justificativa em branco falha", () => {
    const result = financialClosingServerSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: 0,
      extraTotal: 50,
      extraJustification: "   ",
      paymentStatus: "PENDING",
      paymentMethod: null,
    });
    expect(result.success).toBe(false);
  });

  it("extraTotal > 0 com extraJustification passa", () => {
    const result = financialClosingServerSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: 0,
      extraTotal: 50,
      extraJustification: "Taxa de serviço extra",
      paymentStatus: "PENDING",
      paymentMethod: null,
    });
    expect(result.success).toBe(true);
  });

  it("extraTotal = 0 sem extraJustification passa", () => {
    const result = financialClosingServerSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: 0,
      extraTotal: 0,
      paymentStatus: "PENDING",
      paymentMethod: null,
    });
    expect(result.success).toBe(true);
  });

  it("discountTotal > 0 sem discountJustification passa (opcional)", () => {
    const result = financialClosingServerSchema.safeParse({
      reservationId: "550e8400-e29b-41d4-a716-446655440001",
      discountTotal: 100,
      extraTotal: 0,
      paymentStatus: "PENDING",
      paymentMethod: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// reopenClosingSchema
// ---------------------------------------------------------------------------

describe("reopenClosingSchema", () => {
  it("motivo com >= 10 caracteres passa", () => {
    const result = reopenClosingSchema.safeParse({
      reason: "Correção de valores lançados incorretamente",
    });
    expect(result.success).toBe(true);
  });

  it("motivo com exatamente 10 caracteres passa", () => {
    const result = reopenClosingSchema.safeParse({
      reason: "1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("motivo com 5 caracteres falha", () => {
    const result = reopenClosingSchema.safeParse({
      reason: "Erro",
    });
    expect(result.success).toBe(false);
  });

  it("motivo vazio falha", () => {
    const result = reopenClosingSchema.safeParse({
      reason: "",
    });
    expect(result.success).toBe(false);
  });

  it("motivo > 500 caracteres falha", () => {
    const result = reopenClosingSchema.safeParse({
      reason: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
