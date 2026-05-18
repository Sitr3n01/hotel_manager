import "server-only";
import type { UserProfile } from "@prisma/client";
import { ConflictError } from "./errors";
import { findExistingOperation, mapExistingToResult, recordSyncRejection } from "./idempotency";
import type { SyncResult, SyncEntity } from "./types";
import type { SyncOperation } from "@/lib/validations/sync-operation";
import { handleWaste } from "./handlers/waste";
import { handleInternalConsumption } from "./handlers/internal-consumption";
import { handleStockPurchase } from "./handlers/stock-purchase";
import { handleReservationConsumption } from "./handlers/reservation-consumption";
import { handlePreReservation } from "./handlers/pre-reservation";

const ENTITY_BY_TYPE: Record<SyncOperation["operationType"], SyncEntity> = {
  STOCK_PURCHASE_CREATE: "StockMovement",
  INTERNAL_CONSUMPTION_CREATE: "StockMovement",
  WASTE_CREATE: "StockMovement",
  RESERVATION_CONSUMPTION_CREATE: "ReservationConsumption",
  PRE_RESERVATION_CREATE: "Reservation",
};

export async function dispatchOperation(
  op: SyncOperation,
  user: UserProfile,
): Promise<SyncResult> {
  const existing = await findExistingOperation(op.idempotencyKey);
  if (existing) return mapExistingToResult(existing);

  try {
    switch (op.operationType) {
      case "STOCK_PURCHASE_CREATE":
        return await handleStockPurchase(op, user);
      case "INTERNAL_CONSUMPTION_CREATE":
        return await handleInternalConsumption(op, user);
      case "WASTE_CREATE":
        return await handleWaste(op, user);
      case "RESERVATION_CONSUMPTION_CREATE":
        return await handleReservationConsumption(op, user);
      case "PRE_RESERVATION_CREATE":
        return await handlePreReservation(op, user);
    }
  } catch (error) {
    const entity = ENTITY_BY_TYPE[op.operationType];
    if (error instanceof ConflictError) {
      return recordAfterFinalIdempotencyCheck({
        op, user, entity, result: "CONFLICT", reason: error.message,
      });
    }
    const reason = error instanceof Error ? error.message : "Erro inesperado no servidor";
    return recordAfterFinalIdempotencyCheck({
      op, user, entity, result: "FAILED", reason,
    });
  }
}

async function recordAfterFinalIdempotencyCheck(args: Parameters<typeof recordSyncRejection>[0]) {
  const existing = await findExistingOperation(args.op.idempotencyKey);
  if (existing) return mapExistingToResult(existing);
  return recordSyncRejection(args);
}
