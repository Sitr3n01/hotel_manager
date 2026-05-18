"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TimelineCell } from "@/components/reservas/timeline/timeline-cell";
import { TimelineEvent } from "@/components/reservas/timeline/timeline-event";
import {
  DAY_WIDTH_PX,
  ROW_HEIGHT_PX,
  SIDEBAR_WIDTH_PX,
  addDays,
} from "@/components/reservas/timeline/timeline-utils";
import type {
  ReservationWithRelationsForClient,
  RoomWithTypeForClient,
} from "@/lib/client-serialization";

type RoomWithType = RoomWithTypeForClient;
type ReservationWithGuest = ReservationWithRelationsForClient;

type Props = {
  rooms: RoomWithType[];
  reservations: ReservationWithGuest[];
  rangeStart: Date;
  days: number;
  onCellClick: (params: { roomId: string; date: Date }) => void;
  onEventClick: (reservationId: string) => void;
};

export function TimelineGrid({
  rooms,
  reservations,
  rangeStart,
  days,
  onCellClick,
  onEventClick,
}: Props) {
  const daysArray = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(rangeStart, i)),
    [rangeStart, days],
  );

  const eventsByRoom = useMemo(() => {
    const map = new Map<string, ReservationWithGuest[]>();
    for (const r of reservations) {
      const list = map.get(r.roomId) ?? [];
      list.push(r);
      map.set(r.roomId, list);
    }
    return map;
  }, [reservations]);

  const totalWidth = days * DAY_WIDTH_PX;
  const totalHeight = rooms.length * ROW_HEIGHT_PX;

  return (
    <div
      className="border-border/50 relative overflow-auto rounded-md border"
      style={{ maxHeight: "calc(100vh - 300px)" }}
    >
      <TimelineDaysHeader daysArray={daysArray} totalWidth={totalWidth} />
      <div style={{ width: SIDEBAR_WIDTH_PX + totalWidth, height: 32 + totalHeight }}>
        {rooms.map((room, roomIndex) => (
          <TimelineRoomRow
            key={room.id}
            room={room}
            roomIndex={roomIndex}
            daysArray={daysArray}
            events={eventsByRoom.get(room.id) ?? []}
            rangeStart={rangeStart}
            onCellClick={onCellClick}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineDaysHeader({ daysArray, totalWidth }: { daysArray: Date[]; totalWidth: number }) {
  return (
    <div
      className="bg-background border-border absolute top-0 left-0 z-30 h-8 w-48 border-b"
      style={{ left: SIDEBAR_WIDTH_PX, width: totalWidth, display: "flex" }}
    >
      {daysArray.map((date, i) => (
        <TimelineDayHeader date={date} index={i} key={i} />
      ))}
    </div>
  );
}

function TimelineRoomRow({
  room,
  roomIndex,
  daysArray,
  events,
  rangeStart,
  onCellClick,
  onEventClick,
}: {
  room: RoomWithType;
  roomIndex: number;
  daysArray: Date[];
  events: ReservationWithGuest[];
  rangeStart: Date;
  onCellClick: (params: { roomId: string; date: Date }) => void;
  onEventClick: (reservationId: string) => void;
}) {
  const topPx = 32 + roomIndex * ROW_HEIGHT_PX;

  return (
    <div style={{ position: "absolute", top: topPx, left: 0, width: "100%" }}>
      <div
        className="bg-background border-border absolute top-0 left-0 z-20 w-48 border-r"
        style={{ height: ROW_HEIGHT_PX, display: "flex", alignItems: "center" }}
      >
        <span className="truncate px-3 text-sm font-medium">
          {room.number} · {room.name}
        </span>
      </div>
      <div style={{ marginLeft: SIDEBAR_WIDTH_PX, display: "flex" }}>
        {daysArray.map((date, dayIndex) => (
          <TimelineCell
            key={dayIndex}
            day={dayIndex}
            roomId={room.id}
            date={date}
            onClick={onCellClick}
          />
        ))}
      </div>
      {events.map((reservation, ei) => (
        <TimelineEvent
          key={reservation.id}
          reservation={reservation}
          guestName={reservation.guest.name}
          rangeStart={rangeStart}
          topPx={4 + ei * 2}
          onClick={onEventClick}
        />
      ))}
    </div>
  );
}

function TimelineDayHeader({ date, index }: { date: Date; index: number }) {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const dow = format(date, "EEE", { locale: ptBR });
  const dayNum = format(date, "d");

  return (
    <div
      className={cn(
        "border-border/50 flex flex-col items-center justify-center border-r border-b text-xs",
        isWeekend && "bg-muted/30",
      )}
      style={{ width: DAY_WIDTH_PX, height: 32, minWidth: DAY_WIDTH_PX }}
    >
      <span className="text-muted-foreground text-[10px]">{dow}</span>
      <span className={cn("font-medium", index === 0 && "text-primary")}>{dayNum}</span>
    </div>
  );
}
