import { z } from "zod";
import {
  internalConsumptionSchema,
  purchaseSchema,
  wasteSchema,
} from "@/lib/validations/stock-movement";
import { createConsumptionSchema } from "@/lib/validations/reservation-consumption";

// Sync operations travel over HTTP/JSON, so dates and decimals come as strings.
// Each operation has an `idempotencyKey` (UUID v4 generated client-side at the
// moment of enqueue). The server uses it both as the dedupe identifier and as
// the SyncedOperation row key.

const baseOpFields = {
  idempotencyKey: z.string().uuid("idempotencyKey inválido"),
  clientCreatedAt: z.string().datetime("clientCreatedAt inválido"),
};

// Pre-reservation payload: dates as ISO strings, guest can be referenced by id
// or created inline (offline-first secretary case).
export const preReservationPayloadSchema = z
  .object({
    roomId: z.string().uuid("Quarto inválido"),
    guestId: z.string().uuid().optional().nullable(),
    guestName: z.string().min(1).max(200).optional().nullable(),
    guestPhone: z.string().max(50).optional().nullable(),
    guestDocument: z.string().max(50).optional().nullable(),
    checkInDate: z.string().datetime("Data de check-in inválida"),
    checkOutDate: z.string().datetime("Data de check-out inválida"),
    adults: z.number().int().min(1, "Pelo menos 1 adulto"),
    children: z.number().int().min(0, "Crianças não pode ser negativo"),
    dailyRate: z.number().min(0, "Diária não pode ser negativa"),
    discountAmount: z.number().min(0).default(0),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine((d) => new Date(d.checkOutDate).getTime() > new Date(d.checkInDate).getTime(), {
    message: "Check-out deve ser depois do check-in",
    path: ["checkOutDate"],
  })
  .refine((d) => Boolean(d.guestId) || Boolean(d.guestName), {
    message: "Informe um hóspede existente ou um nome para criar",
    path: ["guestName"],
  });

const stockPurchaseOp = z.object({
  ...baseOpFields,
  operationType: z.literal("STOCK_PURCHASE_CREATE"),
  payload: purchaseSchema,
});

const internalConsumptionOp = z.object({
  ...baseOpFields,
  operationType: z.literal("INTERNAL_CONSUMPTION_CREATE"),
  payload: internalConsumptionSchema,
});

const wasteOp = z.object({
  ...baseOpFields,
  operationType: z.literal("WASTE_CREATE"),
  payload: wasteSchema,
});

const reservationConsumptionOp = z.object({
  ...baseOpFields,
  operationType: z.literal("RESERVATION_CONSUMPTION_CREATE"),
  payload: createConsumptionSchema,
});

const preReservationOp = z.object({
  ...baseOpFields,
  operationType: z.literal("PRE_RESERVATION_CREATE"),
  payload: preReservationPayloadSchema,
});

export const syncOperationSchema = z.discriminatedUnion("operationType", [
  stockPurchaseOp,
  internalConsumptionOp,
  wasteOp,
  reservationConsumptionOp,
  preReservationOp,
]);

export const batchRequestSchema = z.object({
  operations: z.array(syncOperationSchema).min(1).max(50),
});

export type SyncOperation = z.infer<typeof syncOperationSchema>;
export type BatchRequest = z.infer<typeof batchRequestSchema>;
export type PreReservationPayload = z.infer<typeof preReservationPayloadSchema>;
