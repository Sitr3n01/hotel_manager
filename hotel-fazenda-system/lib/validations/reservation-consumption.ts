import { z } from "zod";

export const createConsumptionSchema = z.object({
  reservationId: z.string().uuid("Reserva inválida"),
  productId: z.string().uuid("Produto inválido").optional().nullable(),
  description: z
    .string()
    .min(1, "Descrição é obrigatória")
    .max(200, "Descrição muito longa"),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  unitPrice: z.number().nonnegative("Preço unitário não pode ser negativo"),
});

export type CreateConsumptionInput = z.infer<typeof createConsumptionSchema>;
