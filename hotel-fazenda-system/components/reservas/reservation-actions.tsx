"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  LogIn,
  LogOut,
  MoreVertical,
  Loader2,
  Ban,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  confirmReservation,
  markNoShow,
} from "@/lib/actions/reservation";
import { canCancelReservation, canCheckInOut } from "@/lib/permissions";
import { getAllowedNextReservationStatuses } from "@/lib/reservation-status";
import type { Reservation, ReservationStatus, Role } from "@prisma/client";

type Props = {
  reservation: Pick<Reservation, "id" | "status">;
  userRole: Role;
  onError: (message: string) => void;
};

export function ReservationActions({ reservation, userRole, onError }: Props) {
  const router = useRouter();
  const [acting, setActing] = useState(false);
  const allowedStatuses = getAllowedNextReservationStatuses(reservation.status);

  if (allowedStatuses.length === 0) {
    return (
      <Button size="icon-sm" variant="ghost" disabled title="Sem ações disponíveis">
        <MoreVertical className="h-4 w-4 opacity-30" />
      </Button>
    );
  }

  async function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    setActing(true);
    onError("");
    const result = await action();
    setActing(false);
    if (!result.success) {
      onError(result.error ?? "Não foi possível executar a ação");
      return;
    }
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" disabled={acting} />}>
        {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações da reserva</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ReservationActionItems
          allowedStatuses={allowedStatuses}
          reservation={reservation}
          userRole={userRole}
          runAction={runAction}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReservationActionItems({
  allowedStatuses,
  reservation,
  userRole,
  runAction,
}: {
  allowedStatuses: ReservationStatus[];
  reservation: Pick<Reservation, "id" | "status">;
  userRole: Role;
  runAction: (fn: () => Promise<{ success: boolean; error?: string }>) => Promise<void>;
}) {
  const canCheckIO = canCheckInOut(userRole);
  const canCancel = canCancelReservation(userRole);

  return (
    <>
      {allowedStatuses.includes("CONFIRMED") ? (
        <DropdownMenuItem onClick={() => runAction(() => confirmReservation(reservation.id))}>
          <CheckCircle2 className="h-4 w-4" /> Confirmar
        </DropdownMenuItem>
      ) : null}
      {allowedStatuses.includes("CHECKED_IN") && canCheckIO ? (
        <DropdownMenuItem onClick={() => runAction(() => checkInReservation(reservation.id))}>
          <LogIn className="h-4 w-4" /> Check-in
        </DropdownMenuItem>
      ) : null}
      {allowedStatuses.includes("CHECKED_OUT") && canCheckIO ? (
        <DropdownMenuItem onClick={() => runAction(() => checkOutReservation(reservation.id))}>
          <LogOut className="h-4 w-4" /> Check-out
        </DropdownMenuItem>
      ) : null}
      {allowedStatuses.includes("NO_SHOW") ? (
        <DropdownMenuItem onClick={() => runAction(() => markNoShow(reservation.id))}>
          <UserX className="h-4 w-4" /> Marcar no-show
        </DropdownMenuItem>
      ) : null}
      {allowedStatuses.includes("CANCELLED") && canCancel ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => {
              const reason = window.prompt("Motivo do cancelamento (opcional):") ?? undefined;
              runAction(() => cancelReservation(reservation.id, reason));
            }}
          >
            <Ban className="h-4 w-4" /> Cancelar
          </DropdownMenuItem>
        </>
      ) : null}
    </>
  );
}
