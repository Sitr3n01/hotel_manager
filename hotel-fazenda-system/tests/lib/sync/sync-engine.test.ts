import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSync } from "@/lib/sync/sync-engine";
import { enqueue, listAll } from "@/lib/sync/queue";
import { getDb, OPERATIONS_STORE } from "@/lib/sync/db";

async function clearStore() {
  const db = await getDb();
  await db.clear(OPERATIONS_STORE);
}

beforeEach(async () => {
  await clearStore();
  vi.restoreAllMocks();
});

describe("runSync", () => {
  it("returns zeros when queue is empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const summary = await runSync();
    expect(summary).toEqual({ applied: 0, conflicts: 0, failed: 0, total: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("marks SYNCED on APPLIED result and ALREADY_APPLIED result", async () => {
    const appliedId = await enqueue({
      operationType: "WASTE_CREATE",
      payload: { productId: "p1", quantity: 1, reason: "x" },
      createdByUserId: "u1",
    });
    const alreadyId = await enqueue({
      operationType: "WASTE_CREATE",
      payload: { productId: "p2", quantity: 2, reason: "y" },
      createdByUserId: "u1",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            { status: "APPLIED", idempotencyKey: appliedId, entityId: "movement-1" },
            { status: "ALREADY_APPLIED", idempotencyKey: alreadyId, entityId: "movement-2" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const summary = await runSync();
    expect(summary).toEqual({ applied: 2, conflicts: 0, failed: 0, total: 2 });

    const ops = await listAll();
    expect(ops.every((op) => op.status === "SYNCED")).toBe(true);
  });

  it("marks CONFLICT and FAILED according to response", async () => {
    const conflictId = await enqueue({
      operationType: "WASTE_CREATE",
      payload: {},
      createdByUserId: "u1",
    });
    const failedId = await enqueue({
      operationType: "WASTE_CREATE",
      payload: {},
      createdByUserId: "u1",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            { status: "CONFLICT", idempotencyKey: conflictId, reason: "estoque insuficiente" },
            { status: "FAILED", idempotencyKey: failedId, reason: "erro interno" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const summary = await runSync();
    expect(summary).toEqual({ applied: 0, conflicts: 1, failed: 1, total: 2 });

    const ops = await listAll();
    const conflict = ops.find((o) => o.localId === conflictId);
    const failed = ops.find((o) => o.localId === failedId);
    expect(conflict?.status).toBe("CONFLICT");
    expect(conflict?.lastError).toBe("estoque insuficiente");
    expect(failed?.status).toBe("FAILED");
    expect(failed?.lastError).toBe("erro interno");
  });

  it("marks all FAILED with expired-session message when 401", async () => {
    await enqueue({ operationType: "WASTE_CREATE", payload: {}, createdByUserId: "u1" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 }),
    );

    const summary = await runSync();
    expect(summary.failed).toBe(1);

    const [op] = await listAll();
    expect(op.status).toBe("FAILED");
    expect(op.lastError).toMatch(/Sessão expirada/);
  });

  it("marks batch FAILED when fetch throws", async () => {
    await enqueue({ operationType: "WASTE_CREATE", payload: {}, createdByUserId: "u1" });
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));

    const summary = await runSync();
    expect(summary).toEqual({ applied: 0, conflicts: 0, failed: 1, total: 1 });

    const [op] = await listAll();
    expect(op.status).toBe("FAILED");
    expect(op.lastError).toBe("network down");
  });

  it("marks missing server results FAILED instead of leaving SYNCING", async () => {
    const appliedId = await enqueue({
      operationType: "WASTE_CREATE",
      payload: {},
      createdByUserId: "u1",
    });
    const missingId = await enqueue({
      operationType: "WASTE_CREATE",
      payload: {},
      createdByUserId: "u1",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [{ status: "APPLIED", idempotencyKey: appliedId, entityId: "movement-1" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const summary = await runSync();
    expect(summary).toEqual({ applied: 1, conflicts: 0, failed: 1, total: 2 });

    const ops = await listAll();
    expect(ops.find((op) => op.localId === appliedId)?.status).toBe("SYNCED");
    expect(ops.find((op) => op.localId === missingId)?.status).toBe("FAILED");
  });
});
