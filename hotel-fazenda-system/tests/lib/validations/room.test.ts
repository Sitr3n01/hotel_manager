import { describe, expect, it } from "vitest";
import { createRoomSchema, updateRoomSchema, changeRoomStatusSchema } from "@/lib/validations/room";

describe("createRoomSchema", () => {
  it("aceita dados válidos", () => {
    const result = createRoomSchema.safeParse({
      name: "Quarto 101",
      number: "101",
      roomTypeId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Quarto 101");
      expect(result.data.status).toBe("AVAILABLE");
    }
  });

  it("usa status padrão AVAILABLE quando não informado", () => {
    const result = createRoomSchema.safeParse({
      name: "Quarto 102",
      number: "102",
      roomTypeId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("AVAILABLE");
    }
  });

  it("aceita status explícito", () => {
    const result = createRoomSchema.safeParse({
      name: "Quarto 103",
      number: "103",
      roomTypeId: "550e8400-e29b-41d4-a716-446655440000",
      status: "MAINTENANCE",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("MAINTENANCE");
    }
  });

  it("rejeita nome vazio", () => {
    const result = createRoomSchema.safeParse({
      name: "",
      number: "101",
      roomTypeId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita número vazio", () => {
    const result = createRoomSchema.safeParse({
      name: "Quarto 101",
      number: "",
      roomTypeId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita roomTypeId inválido (não UUID)", () => {
    const result = createRoomSchema.safeParse({
      name: "Quarto 101",
      number: "101",
      roomTypeId: "invalido",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita status inválido", () => {
    const result = createRoomSchema.safeParse({
      name: "Quarto 101",
      number: "101",
      roomTypeId: "550e8400-e29b-41d4-a716-446655440000",
      status: "INVALID_STATUS",
    });
    expect(result.success).toBe(false);
  });

  it("aceita observações opcionais", () => {
    const result = createRoomSchema.safeParse({
      name: "Quarto 101",
      number: "101",
      roomTypeId: "550e8400-e29b-41d4-a716-446655440000",
      notes: "Vista para o jardim",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateRoomSchema", () => {
  it("aceita atualização parcial", () => {
    const result = updateRoomSchema.safeParse({ name: "Quarto Renomeado" });
    expect(result.success).toBe(true);
  });

  it("aceita objeto vazio", () => {
    const result = updateRoomSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("aceita atualização de status", () => {
    const result = updateRoomSchema.safeParse({ status: "OCCUPIED" });
    expect(result.success).toBe(true);
  });
});

describe("changeRoomStatusSchema", () => {
  it("aceita roomId e newStatus válidos", () => {
    const result = changeRoomStatusSchema.safeParse({
      roomId: "550e8400-e29b-41d4-a716-446655440000",
      newStatus: "OCCUPIED",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita status inválido", () => {
    const result = changeRoomStatusSchema.safeParse({
      roomId: "550e8400-e29b-41d4-a716-446655440000",
      newStatus: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita roomId vazio", () => {
    const result = changeRoomStatusSchema.safeParse({
      roomId: "",
      newStatus: "AVAILABLE",
    });
    expect(result.success).toBe(false);
  });
});
