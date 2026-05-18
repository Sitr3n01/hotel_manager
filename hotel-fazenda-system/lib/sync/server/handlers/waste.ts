import "server-only";
import type { UserProfile } from "@prisma/client";
import { canRegisterWaste } from "@/lib/permissions";
import { wasteSchema } from "@/lib/validations/stock-movement";
import type { SyncOperation } from "@/lib/validations/sync-operation";
import type { SyncResult } from "../types";
import { runSimpleStockOut } from "./simple-stock-out";

export async function handleWaste(op: SyncOperation, user: UserProfile): Promise<SyncResult> {
  return runSimpleStockOut({
    op, user,
    expectedType: "WASTE_CREATE",
    movementType: "WASTE",
    permission: canRegisterWaste(user),
    permissionDeniedReason: "Usuário perdeu permissão para registrar desperdício",
    payloadSchema: wasteSchema,
    invalidPayloadReason: "Payload de desperdício inválido",
    auditOpType: "WASTE_CREATE",
  });
}
