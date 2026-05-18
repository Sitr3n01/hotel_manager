import { getDb, OPERATIONS_STORE } from "./db";
import type { CountsByStatus, OperationStatus, OperationType, PendingOperation } from "./types";

type EnqueueArgs = {
  operationType: OperationType;
  payload: unknown;
  createdByUserId: string;
};

const RETRYABLE_STATUSES: OperationStatus[] = ["PENDING", "FAILED"];
const STALE_SYNCING_MS = 5 * 60 * 1000;

function randomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback for older test runners.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function enqueue(args: EnqueueArgs): Promise<string> {
  const db = await getDb();
  const localId = randomUUID();
  const record: PendingOperation = {
    localId,
    operationType: args.operationType,
    payload: args.payload,
    status: "PENDING",
    createdAt: Date.now(),
    createdByUserId: args.createdByUserId,
    attempts: 0,
    lastAttemptAt: null,
    lastError: null,
    syncedAt: null,
    entityIdAfterSync: null,
  };
  await db.add(OPERATIONS_STORE, record);
  return localId;
}

export async function listAll(): Promise<PendingOperation[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex(OPERATIONS_STORE, "by-createdAt");
  return all.reverse();
}

export async function listRetryable(): Promise<PendingOperation[]> {
  const all = await listAll();
  const now = Date.now();
  return all.filter((op) => isRetryable(op, now));
}

export async function markSyncing(localId: string): Promise<void> {
  await patch(localId, (op) => {
    op.status = "SYNCING";
    op.attempts += 1;
    op.lastAttemptAt = Date.now();
  });
}

export async function markSynced(localId: string, entityId: string): Promise<void> {
  await patch(localId, (op) => {
    op.status = "SYNCED";
    op.syncedAt = Date.now();
    op.entityIdAfterSync = entityId || null;
    op.lastError = null;
  });
}

export async function markFailed(localId: string, error: string): Promise<void> {
  await patch(localId, (op) => {
    op.status = "FAILED";
    op.lastError = error;
  });
}

export async function markConflict(localId: string, error: string): Promise<void> {
  await patch(localId, (op) => {
    op.status = "CONFLICT";
    op.lastError = error;
  });
}

export async function retry(localId: string): Promise<void> {
  await patch(localId, (op) => {
    op.status = "PENDING";
    op.attempts = 0;
    op.lastAttemptAt = null;
    op.lastError = null;
    op.syncedAt = null;
    op.entityIdAfterSync = null;
  });
}

export async function discard(localId: string): Promise<void> {
  const db = await getDb();
  await db.delete(OPERATIONS_STORE, localId);
}

export async function countByStatus(): Promise<CountsByStatus> {
  const all = await listAll();
  const base: CountsByStatus = {
    PENDING: 0,
    SYNCING: 0,
    SYNCED: 0,
    FAILED: 0,
    CONFLICT: 0,
  };
  for (const op of all) base[op.status] += 1;
  return base;
}

async function patch(
  localId: string,
  mutate: (op: PendingOperation) => void,
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(OPERATIONS_STORE, "readwrite");
  const store = tx.objectStore(OPERATIONS_STORE);
  const existing = await store.get(localId);
  if (!existing) {
    await tx.done;
    return;
  }
  mutate(existing);
  await store.put(existing);
  await tx.done;
}

function isRetryable(op: PendingOperation, now: number): boolean {
  if (RETRYABLE_STATUSES.includes(op.status)) return true;
  if (op.status !== "SYNCING") return false;
  if (!op.lastAttemptAt) return true;
  return now - op.lastAttemptAt > STALE_SYNCING_MS;
}
