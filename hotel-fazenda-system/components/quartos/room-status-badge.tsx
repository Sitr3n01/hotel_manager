import { Badge } from "@/components/ui/badge";
import { getRoomStatusLabel } from "@/lib/room-status";
import type { RoomStatus } from "@prisma/client";

const STATUS_VARIANTS: Record<RoomStatus, "default" | "secondary" | "destructive" | "outline"> = {
  AVAILABLE: "default",
  RESERVED: "secondary",
  OCCUPIED: "default",
  MAINTENANCE: "destructive",
  CLEANING: "outline",
  BLOCKED: "destructive",
};

type Props = { status: RoomStatus };

export function RoomStatusBadge({ status }: Props) {
  return (
    <Badge
      variant={STATUS_VARIANTS[status] ?? "outline"}
      data-status={status}
      className={statusClass(status)}
    >
      {getRoomStatusLabel(status)}
    </Badge>
  );
}

function statusClass(status: RoomStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "border-success/20 bg-success/10 text-success";
    case "OCCUPIED":
      return "border-warning/20 bg-warning/10 text-warning";
    case "RESERVED":
      return "border-accent bg-accent text-accent-foreground";
    case "CLEANING":
      return "border-muted-foreground/30 text-muted-foreground";
    case "MAINTENANCE":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    case "BLOCKED":
      return "border-muted-foreground/20 bg-muted text-muted-foreground";
  }
}
