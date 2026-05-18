export type OperationType =
  | "STOCK_PURCHASE_CREATE"
  | "INTERNAL_CONSUMPTION_CREATE"
  | "WASTE_CREATE"
  | "RESERVATION_CONSUMPTION_CREATE"
  | "PRE_RESERVATION_CREATE";

export type OperationStatus =
  | "PENDING"
  | "SYNCING"
  | "SYNCED"
  | "FAILED"
  | "CONFLICT";

// One record per enqueued operation, persisted in IndexedDB. The `localId`
// (UUID v4) is both the primary key locally and the `idempotencyKey` sent to
// the server — retrying the same key never duplicates.
export type PendingOperation = {
  localId: string;
  operationType: OperationType;
  payload: unknown;
  status: OperationStatus;
  createdAt: number;
  createdByUserId: string;
  attempts: number;
  lastAttemptAt: number | null;
  lastError: string | null;
  syncedAt: number | null;
  entityIdAfterSync: string | null;
};

export type CountsByStatus = Record<OperationStatus, number>;

export type SyncResultPayload =
  | { status: "APPLIED" | "ALREADY_APPLIED"; idempotencyKey: string; entityId: string | null }
  | { status: "CONFLICT" | "FAILED"; idempotencyKey: string; reason: string };
