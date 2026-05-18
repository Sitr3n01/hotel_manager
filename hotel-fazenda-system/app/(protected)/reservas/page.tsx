import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { canViewReservations } from "@/lib/permissions";
import { ReservasPageClient } from "@/components/reservas/reservas-page-client";
import type { ReservationsSummary } from "@/components/reservas/reservation-summary-cards";
import { toDateOnly } from "@/lib/date-format";
import {
  serializeReservationWithRelationsForClient,
  serializeRoomWithTypeForClient,
} from "@/lib/client-serialization";

export default async function ReservasPage() {
  const user = await requireAuth();

  if (!canViewReservations(user)) {
    redirect("/dashboard");
  }

  const today = toDateOnly(new Date());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const [reservations, guests, rooms, summary] = await Promise.all([
    prisma.reservation.findMany({
      orderBy: { checkInDate: "desc" },
      include: { guest: true, room: { include: { roomType: true } } },
    }),
    prisma.guest.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: { number: "asc" },
      include: { roomType: true },
    }),
    buildSummary(today, tomorrow),
  ]);

  return (
    <ReservasPageClient
      userId={user.id}
      userRole={user.role}
      reservations={reservations.map(serializeReservationWithRelationsForClient)}
      guests={guests}
      rooms={rooms.map(serializeRoomWithTypeForClient)}
      summary={summary}
    />
  );
}

async function buildSummary(today: Date, tomorrow: Date): Promise<ReservationsSummary> {
  const [checkInsToday, checkOutsToday, occupiedNow, pendingConfirmation] = await Promise.all([
    prisma.reservation.count({
      where: {
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
        checkInDate: { gte: today, lt: tomorrow },
      },
    }),
    prisma.reservation.count({
      where: {
        status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
        checkOutDate: { gte: today, lt: tomorrow },
      },
    }),
    prisma.reservation.count({ where: { status: "CHECKED_IN" } }),
    prisma.reservation.count({ where: { status: "PRE_RESERVED" } }),
  ]);

  return { checkInsToday, checkOutsToday, occupiedNow, pendingConfirmation };
}
