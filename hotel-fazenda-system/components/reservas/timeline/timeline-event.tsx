"use client";

import { cn } from "@/lib/utils";
import { getReservationStatusLabel } from "@/lib/reservation-status";
import { formatDate } from "@/lib/date-format";
import type { Reservation, ReservationStatus } from "@prisma/client";
import { DAY_WIDTH_PX, dateToPixel, daysBetween } from "@/components/reservas/timeline/timeline-utils";

const STATUS_BG: Record<ReservationStatus, string> = {
  PRE_RESERVED: "bg-warning/20 border-warning/40 text-warning",
  CONFIRMED: "bg-primary/15 border-primary/40 text-primary",
  CHECKED_IN: "bg-success/20 border-success/40 text-success",
  CHECKED_OUT: "bg-muted/30 border-muted-foreground/40 text-muted-foreground",
  CANCELLED: "bg-destructive/10 border-destructive/20 text-destructive/60",
  NO_SHOW: "bg-destructive/10 border-destructive/20 text-destructive/60",
};

type Props = {
  reservation: Pick<Reservation, "id" | "checkInDate" | "checkOutDate" | "status" | "guestId">;
  guestName: string;
  rangeStart: Date;
  topPx: number;
  onClick?: (id: string) => void;
};

export function TimelineEvent({
  reservation,
  guestName,
  rangeStart,
  topPx,
  onClick,
}: Props) {
  const left = dateToPixel(reservation.checkInDate, rangeStart);
  const width = daysBetween(reservation.checkInDate, reservation.checkOutDate) * DAY_WIDTH_PX;

  const tooltip = `${guestName}\n${formatDate(reservation.checkInDate)} – ${formatDate(reservation.checkOutDate)}\n${getReservationStatusLabel(reservation.status)}`;

  return (
    <div
      title={tooltip}
      style={{ left: `${left}px`, width: `${Math.max(width, 4)}px`, top: `${topPx}px` }}
      className={cn(
        "absolute cursor-pointer rounded-md border px-2 py-1 text-xs font-medium line-clamp-1 transition-colors hover:brightness-90",
        STATUS_BG[reservation.status],
      )}
      onClick={() => onClick?.(reservation.id)}
    >
      {guestName}
    </div>
  );
}
