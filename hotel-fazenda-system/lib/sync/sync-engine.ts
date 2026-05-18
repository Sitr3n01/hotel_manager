"use client";
import {
  listRetryable,
  markConflict,
  markFailed,
  markSynced,
  markSyncing,
} from "./queue";
import type { PendingOperation, SyncResultPayload } from "./types";

const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 5;

export type SyncSummary = { applied: number; conflicts: number; failed: number; total: number };

let inFlight = false;

export async function runSync(): Promise<SyncSummary> {
  if (inFlight) return { applied: 0, conflicts: 0, failed: 0, total: 0 };
  inFlight = true;
  let batch: PendingOperation[] = [];
  try {
    batch = (await listRetryable())
      .filter((op) => op.attempts < MAX_ATTEMPTS)
      .slice(0, BATCH_SIZE);
    if (batch.length === 0) return { applied: 0, conflicts: 0, failed: 0, total: 0 };

    await Promise.all(batch.map((op) => markSyncing(op.localId)));

    const res = await fetch("/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operations: batch.map(toSyncPayload) }),
    });

    if (res.status === 401) {
      await Promise.all(
        batch.map((op) => markFailed(op.localId, "Sessão expirada. Faça login para sincronizar.")),
      );
      return { applied: 0, conflicts: 0, failed: batch.length, total: batch.length };
    }
    if (!res.ok) {
      const reason = `Servidor respondeu ${res.status}`;
      await Promise.all(batch.map((op) => markFailed(op.localId, reason)));
      return { applied: 0, conflicts: 0, failed: batch.length, total: batch.length };
    }

    const body = (await res.json()) as { results?: SyncResultPayload[] };
    if (!Array.isArray(body.results)) {
      throw new Error("Resposta de sincronizacao invalida");
    }
    return await reconcileResults(batch, body.results);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Falha de sincronizacao";
    await Promise.all(batch.map((op) => markFailed(op.localId, reason)));
    return { applied: 0, conflicts: 0, failed: batch.length, total: batch.length };
  } finally {
    inFlight = false;
  }
}

async function reconcileResults(
  batch: PendingOperation[],
  results: SyncResultPayload[],
): Promise<SyncSummary> {
  let applied = 0;
  let conflicts = 0;
  let failed = 0;
  const completedIds = new Set<string>();

  for (const result of results) {
    const op = batch.find((p) => p.localId === result.idempotencyKey);
    if (!op) continue;
    completedIds.add(op.localId);
    if (result.status === "APPLIED" || result.status === "ALREADY_APPLIED") {
      await markSynced(op.localId, result.entityId ?? "");
      applied += 1;
    } else if (result.status === "CONFLICT") {
      await markConflict(op.localId, result.reason);
      conflicts += 1;
    } else if (result.status === "FAILED") {
      await markFailed(op.localId, result.reason);
      failed += 1;
    }
  }
  const missing = batch.filter((op) => !completedIds.has(op.localId));
  if (missing.length > 0) {
    const reason = "Servidor nao retornou resultado para esta operacao";
    await Promise.all(missing.map((op) => markFailed(op.localId, reason)));
    failed += missing.length;
  }
  return { applied, conflicts, failed, total: batch.length };
}

function toSyncPayload(op: PendingOperation) {
  return {
    operationType: op.operationType,
    idempotencyKey: op.localId,
    clientCreatedAt: new Date(op.createdAt).toISOString(),
    payload: op.payload,
  };
}
