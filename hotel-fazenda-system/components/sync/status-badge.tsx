import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/sync/format";
import type { OperationStatus } from "@/lib/sync/types";

const STATUS_CLASS: Record<OperationStatus, string> = {
  PENDING: "border-warning/20 bg-warning/10 text-warning",
  SYNCING: "border-accent bg-accent text-accent-foreground",
  SYNCED: "border-success/20 bg-success/10 text-success",
  FAILED: "border-destructive/20 bg-destructive/10 text-destructive",
  CONFLICT: "border-destructive/30 bg-destructive/15 text-destructive",
};

export function SyncStatusBadge({ status }: { status: OperationStatus }) {
  return (
    <Badge variant="outline" data-status={status} className={STATUS_CLASS[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
