import "server-only";
import type { Prisma } from "@prisma/client";
import { isReservationTerminal } from "@/lib/reservation-status";
import { ConflictError } from "../errors";

export async function loadEditableReservation(
  tx: Prisma.TransactionClient,
  reservationId: string,
) {
  const reservation = await tx.reservation.findUnique({
    where: { id: reservationId },
    include: { closing: true },
  });
  if (!reservation) {
    throw new ConflictError("Reserva não encontrada");
  }
  if (isReservationTerminal(reservation.status) && reservation.status !== "CHECKED_OUT") {
    throw new ConflictError("Reserva cancelada/no-show não aceita consumo");
  }
  if (reservation.closing?.closedAt) {
    throw new ConflictError("Reserva já fechada não aceita alteração de consumo");
  }
  return reservation;
}
