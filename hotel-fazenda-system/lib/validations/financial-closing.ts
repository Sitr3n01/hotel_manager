import { z } from "zod";
import { PaymentStatus, PaymentMethod } from "@prisma/client";

export const financialClosingSchema = z.object({
  reservationId: z.string().uuid("Reserva inválida"),
  discountTotal: z.coerce
    .number()
    .min(0, "Desconto não pode ser negativo")
    .max(999999.99, "Desconto acima do permitido"),
  extraTotal: z.coerce
    .number()
    .min(0, "Acréscimo não pode ser negativo")
    .max(999999.99, "Acréscimo acima do permitido"),
  discountJustification: z.string().max(500, "Máximo 500 caracteres").optional(),
  extraJustification: z.string().max(500, "Máximo 500 caracteres").optional(),
  paymentStatus: z.nativeEnum(PaymentStatus, {
    message: "Status de pagamento inválido",
  }),
  paymentMethod: z
    .nativeEnum(PaymentMethod, { message: "Método de pagamento inválido" })
    .nullable(),
});

export const financialClosingServerSchema = financialClosingSchema.superRefine(
  (data, ctx) => {
    if (data.extraTotal > 0 && !data.extraJustification?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Justificativa obrigatória para acréscimos",
        path: ["extraJustification"],
      });
    }
  },
);

export const reopenClosingSchema = z.object({
  reason: z
    .string()
    .min(10, "Motivo deve ter pelo menos 10 caracteres")
    .max(500, "Motivo deve ter no máximo 500 caracteres"),
});

export type FinancialClosingInput = z.infer<typeof financialClosingSchema>;
export type ReopenClosingInput = z.infer<typeof reopenClosingSchema>;
