import { describe, expect, it } from "vitest";
import { createGuestSchema, updateGuestSchema } from "@/lib/validations/guest";

describe("createGuestSchema", () => {
  it("aceita dados mínimos (só nome)", () => {
    const result = createGuestSchema.safeParse({ name: "João da Silva" });
    expect(result.success).toBe(true);
  });

  it("aceita dados completos", () => {
    const result = createGuestSchema.safeParse({
      name: "Maria Souza",
      phone: "(11) 99999-9999",
      document: "123.456.789-00",
      email: "maria@example.com",
      notes: "Vegetariana",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    const result = createGuestSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita nome maior que 200 caracteres", () => {
    const result = createGuestSchema.safeParse({ name: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("aceita email vazio (campo opcional)", () => {
    const result = createGuestSchema.safeParse({ name: "João", email: "" });
    expect(result.success).toBe(true);
  });

  it("rejeita email com formato inválido", () => {
    const result = createGuestSchema.safeParse({ name: "João", email: "nao-eh-email" });
    expect(result.success).toBe(false);
  });

  it("aceita campos opcionais como undefined", () => {
    const result = createGuestSchema.safeParse({
      name: "João",
      phone: undefined,
      document: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("aceita campos opcionais como null", () => {
    const result = createGuestSchema.safeParse({
      name: "João",
      phone: null,
      document: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita observações maiores que 1000 caracteres", () => {
    const result = createGuestSchema.safeParse({
      name: "João",
      notes: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateGuestSchema", () => {
  it("aceita objeto vazio (atualização parcial)", () => {
    const result = updateGuestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("aceita apenas nome", () => {
    const result = updateGuestSchema.safeParse({ name: "Novo Nome" });
    expect(result.success).toBe(true);
  });

  it("aceita apenas email", () => {
    const result = updateGuestSchema.safeParse({ email: "novo@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejeita email inválido em update", () => {
    const result = updateGuestSchema.safeParse({ email: "invalido" });
    expect(result.success).toBe(false);
  });
});
