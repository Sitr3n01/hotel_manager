"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { TimelineToolbar } from "@/components/reservas/timeline/timeline-toolbar";
import { TimelineGrid } from "@/components/reservas/timeline/timeline-grid";
import { ReservationFormDialog } from "@/components/reservas/reservation-form-dialog";
import { useTimelineRange } from "@/components/reservas/timeline/use-timeline-range";
import { addDays } from "@/components/reservas/timeline/timeline-utils";
import { canManageReservations } from "@/lib/permissions";
import type {
  ReservationWithRelationsForClient,
  RoomWithTypeForClient,
} from "@/lib/client-serialization";
import type { Guest, Role } from "@prisma/client";

type RoomWithType = RoomWithTypeForClient;
type ReservationWithGuest = ReservationWithRelationsForClient;

type Props = {
  reservations: ReservationWithGuest[];
  guests: Guest[];
  rooms: RoomWithType[];
  userRole: Role;
};

export function ReservationsTimelineTab({ reservations, guests, rooms, userRole }: Props) {
  const router = useRouter();
  const range = useTimelineRange();
  const canManage = canManageReservations(userRole);

  const [dialogState, setDialogState] = useState<
    | { mode: "create"; roomId?: string; checkInDate?: Date }
    | { mode: "edit"; reservationId: string }
    | null
  >(null);

  function handleCellClick({ roomId, date }: { roomId: string; date: Date }) {
    if (!canManage) return;
    setDialogState({ mode: "create", roomId, checkInDate: date });
  }

  function handleEventClick(reservationId: string) {
    setDialogState({ mode: "edit", reservationId });
  }

  function handleDialogDone() {
    setDialogState(null);
    router.refresh();
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) setDialogState(null);
  }

  const editReservation =
    dialogState?.mode === "edit"
      ? reservations.find((r) => r.id === dialogState.reservationId)
      : null;

  return (
    <div className="space-y-4">
      <TimelineToolbar
        start={range.start}
        end={range.end}
        days={range.days}
        onBack={range.goBack}
        onForward={range.goForward}
        onToday={range.goToday}
        onDaysChange={range.setDaysVisible}
      />

      {rooms.length === 0 ? (
        <TimelineEmptyState />
      ) : (
        <TimelineGrid
          rooms={rooms}
          reservations={reservations}
          rangeStart={range.start}
          days={range.days}
          onCellClick={handleCellClick}
          onEventClick={handleEventClick}
        />
      )}

      <TimelineDialogGateway
        dialogState={dialogState}
        editReservation={editReservation}
        guests={guests}
        rooms={rooms}
        onDone={handleDialogDone}
        onOpenChange={handleDialogOpenChange}
      />
    </div>
  );
}

function TimelineDialogGateway({
  dialogState,
  editReservation,
  guests,
  rooms,
  onDone,
  onOpenChange,
}: {
  dialogState:
    | { mode: "create"; roomId?: string; checkInDate?: Date }
    | { mode: "edit"; reservationId: string }
    | null;
  editReservation: ReservationWithGuest | null | undefined;
  guests: Guest[];
  rooms: RoomWithType[];
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (dialogState?.mode === "create") {
    return (
      <ReservationFormDialog
        key={`${dialogState.roomId ?? "new"}-${dialogState.checkInDate?.toISOString() ?? "none"}`}
        mode="create"
        guests={guests}
        rooms={rooms}
        onDone={onDone}
        open
        hideTrigger
        onOpenChange={onOpenChange}
        initialValues={getTimelineDefaults(dialogState)}
      />
    );
  }

  if (!editReservation) return null;
  return (
    <ReservationFormDialog
      key={editReservation.id}
      mode="edit"
      reservation={editReservation}
      guests={guests}
      rooms={rooms}
      onDone={onDone}
      open
      hideTrigger
      onOpenChange={onOpenChange}
    />
  );
}

function getTimelineDefaults(dialogState: { roomId?: string; checkInDate?: Date }) {
  return {
    roomId: dialogState.roomId,
    checkInDate: dialogState.checkInDate,
    checkOutDate: dialogState.checkInDate ? addDays(dialogState.checkInDate, 1) : undefined,
  };
}

function TimelineEmptyState() {
  return (
    <div className="border-border/60 bg-muted/30 flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <CalendarRange className="text-muted-foreground/50 h-10 w-10" />
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">Nenhum quarto cadastrado</p>
        <p className="text-muted-foreground max-w-md text-xs">
          Cadastre quartos em /quartos para visualizar a linha do tempo de ocupação.
        </p>
      </div>
    </div>
  );
}
