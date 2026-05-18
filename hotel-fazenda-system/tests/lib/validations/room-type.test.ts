import { describe, expect, it } from "vitest";
import { createRoomTypeSchema, updateRoomTypeSchema } from "@/lib/validations/room-type";

describe("createRoomTypeSchema", () => {
  it("aceita dados válidos", () => {
    const result = createRoomTypeSchema.safeParse({
      name: "Suíte Master",
      baseCapacity: 2,
      maxCapacity: 4,
      basePrice: 350,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Suíte Master");
      expect(result.data.baseCapacity).toBe(2);
      expect(result.data.maxCapacity).toBe(4);
      expect(result.data.basePrice).toBe(350);
    }
  });

  it("aceita descrição opcional", () => {
    const result = createRoomTypeSchema.safeParse({
      name: "Standard",
      description: "Quarto padrão com cama de casal",
      baseCapacity: 2,
      maxCapacity: 2,
      basePrice: 200,
    });
    expect(result.success).toBe(true);
  });

  it("converte strings numéricas para número (coerce)", () => {
    const result = createRoomTypeSchema.safeParse({
      name: "Econômico",
      baseCapacity: "1",
      maxCapacity: "1",
      basePrice: "150",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.baseCapacity).toBe("number");
      expect(typeof result.data.basePrice).toBe("number");
    }
  });

  it("rejeita nome vazio", () => {
    const result = createRoomTypeSchema.safeParse({
      name: "",
      baseCapacity: 2,
      maxCapacity: 4,
      basePrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita capacidade base zero", () => {
    const result = createRoomTypeSchema.safeParse({
      name: "Teste",
      baseCapacity: 0,
      maxCapacity: 4,
      basePrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita capacidade base negativa", () => {
    const result = createRoomTypeSchema.safeParse({
      name: "Teste",
      baseCapacity: -1,
      maxCapacity: 4,
      basePrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita quando maxCapacity é menor que baseCapacity", () => {
    const result = createRoomTypeSchema.safeParse({
      name: "Teste",
      baseCapacity: 4,
      maxCapacity: 2,
      basePrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita preço base negativo", () => {
    const result = createRoomTypeSchema.safeParse({
      name: "Teste",
      baseCapacity: 2,
      maxCapacity: 4,
      basePrice: -10,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateRoomTypeSchema", () => {
  it("aceita atualização parcial com apenas nome", () => {
    const result = updateRoomTypeSchema.safeParse({ name: "Novo nome" });
    expect(result.success).toBe(true);
  });

  it("aceita objeto vazio (todos os campos opcionais)", () => {
    const result = updateRoomTypeSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("valida refine quando ambos capacity estão presentes", () => {
    const result = updateRoomTypeSchema.safeParse({
      baseCapacity: 5,
      maxCapacity: 3,
    });
    expect(result.success).toBe(false);
  });
});
