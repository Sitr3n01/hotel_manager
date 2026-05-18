"use client";
import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { SyncStatusBadge } from "@/components/sync/status-badge";
import { OPERATION_LABEL, formatTimestamp } from "@/lib/sync/format";
import { discard, retry } from "@/lib/sync/queue";
import { runSync } from "@/lib/sync/sync-engine";
import type { PendingOperation } from "@/lib/sync/types";

type Props = {
  op: PendingOperation;
  onChange: () => Promise<void>;
};

export function PendingRow({ op, onChange }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleRetry() {
    setBusy(true);
    await retry(op.localId);
    await runSync();
    await onChange();
    setBusy(false);
  }

  async function handleDiscard() {
    setBusy(true);
    await discard(op.localId);
    await onChange();
    setBusy(false);
  }

  const canRetry = op.status === "FAILED" || op.status === "CONFLICT";
  const canDiscard = op.status !== "SYNCING";

  return (
    <TableRow data-status={op.status}>
      <TableCell className="text-sm">{OPERATION_LABEL[op.operationType]}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatTimestamp(op.createdAt)}
      </TableCell>
      <TableCell>
        <SyncStatusBadge status={op.status} />
      </TableCell>
      <TableCell className="text-xs">
        {op.lastError ? (
          <span className="text-destructive">{op.lastError}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {canRetry ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              disabled={busy}
              title="Tentar novamente"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          ) : null}
          {canDiscard ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDiscard}
              disabled={busy}
              title="Descartar"
            >
              <Trash2 className="text-destructive h-3 w-3" />
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
