import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { SyncPageClient } from "@/components/sync/sync-page-client";

export type SyncHistoryItem = {
  id: string;
  idempotencyKey: string;
  operationType: string;
  entity: string;
  entityId: string | null;
  result: string;
  errorMessage: string | null;
  createdAt: string;
};

export default async function SincronizacaoPage() {
  const user = await requireAuth();

  const history = await prisma.syncedOperation.findMany({
    where: { actorId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const serialized: SyncHistoryItem[] = history.map((row) => ({
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    operationType: row.operationType,
    entity: row.entity,
    entityId: row.entityId,
    result: row.result,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
  }));

  return <SyncPageClient history={serialized} />;
}
