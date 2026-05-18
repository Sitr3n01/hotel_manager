import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const accessRequestSchema = z
  .object({
    name: z.string().trim().min(3, "Informe seu nome completo").max(120, "Nome muito longo"),
    email: z.string().trim().email("Informe um e-mail válido").max(160, "E-mail muito longo"),
    phone: z.string().trim().max(30, "Telefone muito longo").optional().or(z.literal("")),
    requestedRole: z.enum(["GERENCIA", "SECRETARIA", "COZINHA", "FINANCEIRO"], {
      error: "Selecione uma função",
    }),
    requestMessage: z.string().trim().max(500, "Use até 500 caracteres").optional().or(z.literal("")),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export const rejectUserSchema = z.object({
  reason: z.string().trim().min(3, "Informe o motivo").max(500, "Use até 500 caracteres"),
});

export const updateUserPermissionsSchema = z.object({
  userId: z.string().uuid("Usuário inválido"),
  role: z.enum(["ADMIN", "GERENCIA", "SECRETARIA", "COZINHA", "FINANCEIRO", "UNASSIGNED"]),
  permissions: z.array(z.string()).default([]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AccessRequestInput = z.infer<typeof accessRequestSchema>;
export type RejectUserInput = z.infer<typeof rejectUserSchema>;
export type UpdateUserPermissionsInput = z.infer<typeof updateUserPermissionsSchema>;
