import "server-only";
import { Prisma, type Prisma as PrismaTypes, type ReservationConsumption } from "@prisma/client";

// Centralizes the row shape for ReservationConsumption creation. Both the
// online server action and the offline sync handler call this helper so the
// math (totalPrice = unitPrice * quantity) and column defaults stay in one
// place.
export type ConsumptionInput = {
  reservationId: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
};

export async function createReservationConsumptionRow(
  tx: PrismaTypes.TransactionClient,
  input: ConsumptionInput,
  options: { createdById: string; idempotencyKey?: string; origin?: string },
): Promise<ReservationConsumption> {
  const totalPrice = new Prisma.Decimal(input.unitPrice).mul(input.quantity);
  return tx.reservationConsumption.create({
    data: {
      reservationId: input.reservationId,
      productId: input.productId ?? null,
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      totalPrice,
      createdById: options.createdById,
      idempotencyKey: options.idempotencyKey,
      origin: options.origin,
    },
  });
}
