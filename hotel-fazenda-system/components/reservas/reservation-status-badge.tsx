import { Badge } from "@/components/ui/badge";
import { getReservationStatusLabel } from "@/lib/reservation-status";
import { cn } from "@/lib/utils";
import type { ReservationStatus } from "@prisma/client";

const STATUS_CLASSES: Record<ReservationStatus, string> = {
  PRE_RESERVED: "bg-warning/15 text-warning border-warning/30",
  CONFIRMED: "bg-primary/10 text-primary border-primary/30",
  CHECKED_IN: "bg-success/10 text-success border-success/30",
  CHECKED_OUT: "bg-muted text-muted-foreground border-muted-foreground/30",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
  NO_SHOW: "bg-destructive/10 text-destructive border-destructive/30",
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <Badge variant="outline" className={cn("border", STATUS_CLASSES[status])}>
      {getReservationStatusLabel(status)}
    </Badge>
  );
}
