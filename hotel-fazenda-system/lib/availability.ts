import "server-only";
import { prisma } from "@/lib/prisma";
import { RESERVATION_OCCUPYING_STATUSES } from "@/lib/reservation-status";
import type { Reservation } from "@prisma/client";

type OverlapQuery = {
  roomId: string;
  checkInDate: Date;
  checkOutDate: Date;
  excludeReservationId?: string;
};

export async function findOverlappingReservation({
  roomId,
  checkInDate,
  checkOutDate,
  excludeReservationId,
}: OverlapQuery): Promise<Reservation | null> {
  return prisma.reservation.findFirst({
    where: {
      roomId,
      status: { in: [...RESERVATION_OCCUPYING_STATUSES] },
      checkInDate: { lt: checkOutDate },
      checkOutDate: { gt: checkInDate },
      ...(excludeReservationId ? { NOT: { id: excludeReservationId } } : {}),
    },
    orderBy: { checkInDate: "asc" },
  });
}

type AvailableRoomsQuery = {
  checkInDate: Date;
  checkOutDate: Date;
  roomTypeId?: string;
};

export async function listAvailableRooms({
  checkInDate,
  checkOutDate,
  roomTypeId,
}: AvailableRoomsQuery) {
  return prisma.room.findMany({
    where: {
      isActive: true,
      ...(roomTypeId ? { roomTypeId } : {}),
      reservations: {
        none: {
          status: { in: [...RESERVATION_OCCUPYING_STATUSES] },
          checkInDate: { lt: checkOutDate },
          checkOutDate: { gt: checkInDate },
        },
      },
    },
    orderBy: { number: "asc" },
    include: { roomType: true },
  });
}
