"use client";

import { cn } from "@/lib/utils";
import { DAY_WIDTH_PX, ROW_HEIGHT_PX } from "@/components/reservas/timeline/timeline-utils";

type Props = {
  day: number;
  roomId: string;
  date: Date;
  onClick: (params: { roomId: string; date: Date }) => void;
};

export function TimelineCell({ day, date, roomId, onClick }: Props) {
  return (
    <div
      style={{ width: DAY_WIDTH_PX, height: ROW_HEIGHT_PX }}
      className={cn(
        "border-r border-b border-border/50 shrink-0",
        "cursor-pointer transition-colors hover:bg-primary/5",
      )}
      onClick={() => onClick({ roomId, date })}
      aria-label={`Quarto ${roomId}, dia ${day}`}
    />
  );
}
