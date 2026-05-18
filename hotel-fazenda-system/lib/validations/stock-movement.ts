import { z } from "zod";

const QtyField = z.number().positive("Quantidade deve ser maior que zero");
const ReasonRequired = z
  .string()
  .min(3, "Motivo é obrigatório (mínimo 3 caracteres)")
  .max(500, "Motivo muito longo");
const ReasonOptional = z
  .string()
  .max(500, "Motivo muito longo")
  .optional()
  .nullable()
  .or(z.literal(""));

export const purchaseItemSchema = z.object({
  productId: z.string().uuid("Produto inválido"),
  quantity: QtyField,
  totalCost: z.number().nonnegative("Custo total não pode ser negativo"),
});

export const purchaseSchema = z.object({
  items: z
    .array(purchaseItemSchema)
    .min(1, "Adicione pelo menos um item")
    .max(50, "Máximo 50 itens por entrada"),
  reason: ReasonOptional,
});

export const internalConsumptionSchema = z.object({
  productId: z.string().uuid("Produto inválido"),
  quantity: QtyField,
  reason: ReasonOptional,
});

export const wasteSchema = z.object({
  productId: z.string().uuid("Produto inválido"),
  quantity: QtyField,
  reason: ReasonRequired,
});

export const adjustmentSchema = z.object({
  productId: z.string().uuid("Produto inválido"),
  quantity: QtyField,
  direction: z.enum(["POSITIVE", "NEGATIVE"]),
  reason: ReasonRequired,
});

export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type InternalConsumptionInput = z.infer<typeof internalConsumptionSchema>;
export type WasteInput = z.infer<typeof wasteSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
