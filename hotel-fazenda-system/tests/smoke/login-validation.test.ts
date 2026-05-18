import { describe, expect, it } from "vitest";
import { loginSchema } from "@/lib/validations/login";

describe("loginSchema", () => {
  it("aceita entrada válida", () => {
    const result = loginSchema.safeParse({
      email: "admin@hotelfazenda.com",
      password: "senha123",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita email inválido", () => {
    const result = loginSchema.safeParse({ email: "nao-eh-email", password: "senha123" });
    expect(result.success).toBe(false);
  });

  it("aceita senha curta para o Supabase validar a credencial", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "123" });
    expect(result.success).toBe(true);
  });
});
