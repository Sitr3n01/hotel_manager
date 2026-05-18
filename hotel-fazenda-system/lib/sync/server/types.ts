import "server-only";

export type OperationType =
  | "STOCK_PURCHASE_CREATE"
  | "INTERNAL_CONSUMPTION_CREATE"
  | "WASTE_CREATE"
  | "RESERVATION_CONSUMPTION_CREATE"
  | "PRE_RESERVATION_CREATE";

export type SyncEntity =
  | "StockMovement"
  | "ReservationConsumption"
  | "Reservation";

export type SyncResultStatus =
  | "APPLIED"
  | "ALREADY_APPLIED"
  | "CONFLICT"
  | "FAILED";

export type SyncResult =
  | {
      status: "APPLIED" | "ALREADY_APPLIED";
      idempotencyKey: string;
      entityId: string | null;
    }
  | {
      status: "CONFLICT" | "FAILED";
      idempotencyKey: string;
      reason: string;
    };
