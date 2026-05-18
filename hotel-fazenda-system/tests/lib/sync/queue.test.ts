import { beforeEach, describe, expect, it } from "vitest";
import {
  countByStatus,
  discard,
  enqueue,
  listAll,
  listRetryable,
  markConflict,
  markFailed,
  markSynced,
  markSyncing,
  retry,
} from "@/lib/sync/queue";
import { getDb, OPERATIONS_STORE } from "@/lib/sync/db";

async function clearStore() {
  const db = await getDb();
  await db.clear(OPERATIONS_STORE);
}

beforeEach(async () => {
  await clearStore();
});

describe("sync queue", () => {
  it("enqueues a PENDING operation with localId", async () => {
    const localId = await enqueue({
      operationType: "WASTE_CREATE",
      payload: { productId: "p1", quantity: 1, reason: "teste" },
      createdByUserId: "u1",
    });
    expect(localId).toMatch(/[0-9a-f-]{36}/);

    const all = await listAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      localId,
      operationType: "WASTE_CREATE",
      status: "PENDING",
      attempts: 0,
      lastError: null,
    });
  });

  it("counts operations by status", async () => {
    const a = await enqueue({ operationType: "WASTE_CREATE", payload: {}, createdByUserId: "u1" });
    const b = await enqueue({
      operationType: "INTERNAL_CONSUMPTION_CREATE",
      payload: {},
      createdByUserId: "u1",
    });
    await markSyncing(a);
    await markConflict(b, "estoque negativo");

    const counts = await countByStatus();
    expect(counts).toEqual({ PENDING: 0, SYNCING: 1, SYNCED: 0, FAILED: 0, CONFLICT: 1 });
  });

  it("transitions PENDING → SYNCING → SYNCED", async () => {
    const id = await enqueue({ operationType: "WASTE_CREATE", payload: {}, createdByUserId: "u1" });
    await markSyncing(id);
    await markSynced(id, "movement-123");

    const [op] = await listAll();
    expect(op.status).toBe("SYNCED");
    expect(op.entityIdAfterSync).toBe("movement-123");
    expect(op.attempts).toBe(1);
    expect(op.syncedAt).not.toBeNull();
  });

  it("listRetryable returns only PENDING and FAILED", async () => {
    const pending = await enqueue({
      operationType: "WASTE_CREATE",
      payload: {},
      createdByUserId: "u1",
    });
    const failed = await enqueue({
      operationType: "WASTE_CREATE",
      payload: {},
      createdByUserId: "u1",
    });
    const synced = await enqueue({
      operationType: "WASTE_CREATE",
      payload: {},
      createdByUserId: "u1",
    });
    const conflict = await enqueue({
      operationType: "WASTE_CREATE",
      payload: {},
      createdByUserId: "u1",
    });

    await markFailed(failed, "boom");
    await markSyncing(synced);
    await markSynced(synced, "x");
    await markConflict(conflict, "estoque");

    const ids = (await listRetryable()).map((op) => op.localId).sort();
    expect(ids.sort()).toEqual([pending, failed].sort());
  });

  it("retry resets a FAILED operation back to PENDING", async () => {
    const id = await enqueue({ operationType: "WASTE_CREATE", payload: {}, createdByUserId: "u1" });
    await markFailed(id, "boom");
    await markSyncing(id);
    await retry(id);

    const [op] = await listAll();
    expect(op.status).toBe("PENDING");
    expect(op.lastError).toBeNull();
    expect(op.attempts).toBe(0);
    expect(op.lastAttemptAt).toBeNull();
  });

  it("discard removes the operation", async () => {
    const id = await enqueue({ operationType: "WASTE_CREATE", payload: {}, createdByUserId: "u1" });
    await discard(id);
    expect(await listAll()).toHaveLength(0);
  });

  it("markSyncing increments attempts", async () => {
    const id = await enqueue({ operationType: "WASTE_CREATE", payload: {}, createdByUserId: "u1" });
    await markSyncing(id);
    await markFailed(id, "x");
    await markSyncing(id);
    const [op] = await listAll();
    expect(op.attempts).toBe(2);
  });

  it("recovers stale SYNCING operations as retryable", async () => {
    const id = await enqueue({ operationType: "WASTE_CREATE", payload: {}, createdByUserId: "u1" });
    await markSyncing(id);

    const db = await getDb();
    const op = await db.get(OPERATIONS_STORE, id);
    await db.put(OPERATIONS_STORE, {
      ...op!,
      lastAttemptAt: Date.now() - 6 * 60 * 1000,
    });

    const retryable = await listRetryable();
    expect(retryable.map((item) => item.localId)).toContain(id);
  });
});
