import "server-only";
import type { UserProfile } from "@prisma/client";
import { canRegisterInternalConsumption } from "@/lib/permissions";
import { internalConsumptionSchema } from "@/lib/validations/stock-movement";
import type { SyncOperation } from "@/lib/validations/sync-operation";
import type { SyncResult } from "../types";
import { runSimpleStockOut } from "./simple-stock-out";

export async function handleInternalConsumption(
  op: SyncOperation,
  user: UserProfile,
): Promise<SyncResult> {
  return runSimpleStockOut({
    op, user,
    expectedType: "INTERNAL_CONSUMPTION_CREATE",
    movementType: "INTERNAL_CONSUMPTION",
    permission: canRegisterInternalConsumption(user),
    permissionDeniedReason: "Usuário perdeu permissão para registrar consumo interno",
    payloadSchema: internalConsumptionSchema,
    invalidPayloadReason: "Payload de consumo interno inválido",
    auditOpType: "INTERNAL_CONSUMPTION_CREATE",
  });
}
