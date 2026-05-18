import { z } from "zod";

const optionalString = (max: number, message: string) =>
  z.string().max(max, message).optional().nullable().or(z.literal(""));

const guestFields = {
  name: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo"),
  phone: optionalString(30, "Telefone muito longo"),
  document: optionalString(30, "Documento muito longo"),
  email: z
    .string()
    .max(200, "Email muito longo")
    .email("Email inválido")
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: optionalString(1000, "Observações muito longas"),
};

export const createGuestSchema = z.object(guestFields);

export const updateGuestSchema = z.object(guestFields).partial();

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
