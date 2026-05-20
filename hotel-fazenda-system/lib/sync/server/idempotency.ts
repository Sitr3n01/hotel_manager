import "server-only";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { Prisma, type SyncedOperation, type UserProfile } from "@prisma/client";
import type { SyncOperation } from "@/lib/validations/sync-operation";
import type { SyncEntity, SyncResult, SyncResultStatus } from "./types";

// Scoped by actor: a SyncedOperation row is only returned to its original
// actor. The idempotencyKey is globally @unique in the schema, so two distinct
// actors can never both have a row for the same key — but if user A owns the
// key, lookups by user B return null here. Use hasForeignOperation() to detect
// the foreign-collision case without leaking A's entityId.
export async function findExistingOperation(
  idempotencyKey: string,
  actorId: string,
): Promise<SyncedOperation | null> {
  return prisma.syncedOperation.findFirst({
    where: { idempotencyKey, actorId },
  });
}

export async function hasForeignOperation(
  idempotencyKey: string,
  actorId: string,
): Promise<boolean> {
  const row = await prisma.syncedOperation.findFirst({
    where: { idempotencyKey, NOT: { actorId } },
    select: { id: true },
  });
  return row !== null;
}

export function foreignKeyConflictResult(idempotencyKey: string): SyncResult {
  return {
    status: "CONFLICT",
    idempotencyKey,
    reason: "Chave de idempotência em conflito",
  };
}

// Returns a final SyncResult when the idempotencyKey is already accounted for
// (own actor — replay it; foreign actor — generic conflict). Returns null when
// the caller should proceed to actually run the operation.
export async function resolveIdempotencyState(
  idempotencyKey: string,
  actorId: string,
): Promise<SyncResult | null> {
  const existing = await findExistingOperation(idempotencyKey, actorId);
  if (existing) return mapExistingToResult(existing);
  if (await hasForeignOperation(idempotencyKey, actorId)) {
    return foreignKeyConflictResult(idempotencyKey);
  }
  return null;
}

export function mapExistingToResult(existing: SyncedOperation): SyncResult {
  if (existing.result === "APPLIED") {
    return {
      status: "ALREADY_APPLIED",
      idempotencyKey: existing.idempotencyKey,
      entityId: existing.entityId,
    };
  }
  return {
    status: existing.result === "CONFLICT" ? "CONFLICT" : "FAILED",
    idempotencyKey: existing.idempotencyKey,
    reason: existing.errorMessage ?? "Operação rejeitada anteriormente",
  };
}

// Persist a SyncedOperation row + matching audit log. Used by handlers when
// an operation is rejected (CONFLICT/FAILED) and no domain row is created.
export async function recordSyncRejection(args: {
  op: SyncOperation;
  user: UserProfile;
  result: "CONFLICT" | "FAILED";
  reason: string;
  entity: SyncEntity;
}): Promise<SyncResult> {
  try {
    await prisma.syncedOperation.create({
      data: buildSyncedOperationData({
        op: args.op,
        user: args.user,
        result: args.result,
        entity: args.entity,
        entityId: null,
        errorMessage: args.reason,
      }),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await findExistingOperation(args.op.idempotencyKey, args.user.id);
      if (existing) return mapExistingToResult(existing);
      return foreignKeyConflictResult(args.op.idempotencyKey);
    }
    throw error;
  }
  await logAudit({
    actorId: args.user.id,
    action: args.result === "CONFLICT" ? "OFFLINE_SYNC_CONFLICT" : "OFFLINE_SYNC_FAILED",
    entity: args.entity,
    entityId: args.op.idempotencyKey,
    metadata: {
      operationType: args.op.operationType,
      idempotencyKey: args.op.idempotencyKey,
      reason: args.reason,
    },
  });
  return {
    status: args.result,
    idempotencyKey: args.op.idempotencyKey,
    reason: args.reason,
  };
}

export function buildSyncedOperationData(args: {
  op: SyncOperation;
  user: UserProfile;
  result: SyncResultStatus;
  entity: SyncEntity;
  entityId: string | null;
  errorMessage: string | null;
}): Prisma.SyncedOperationCreateInput {
  return {
    idempotencyKey: args.op.idempotencyKey,
    operationType: args.op.operationType,
    entity: args.entity,
    entityId: args.entityId,
    result: args.result,
    errorMessage: args.errorMessage,
    payload: args.op.payload as Prisma.InputJsonValue,
    actor: { connect: { id: args.user.id } },
  };
}
