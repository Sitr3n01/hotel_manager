import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { canViewReservations } from "@/lib/permissions";
import { listProducts } from "@/lib/actions/product";
import { listConsumptionsForReservation } from "@/lib/actions/reservation-consumption";
import { ReservationConsumoTab } from "@/components/reservas/reservation-consumo-tab";
import { ReservationStatusBadge } from "@/components/reservas/reservation-status-badge";
import { formatDateRange } from "@/lib/date-format";
import {
  serializeConsumptionForClient,
  serializeProductForClient,
} from "@/lib/client-serialization";
type PageProps = { params: Promise<{ id: string }> };

export default async function ReservationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();
  if (!canViewReservations(user)) notFound();

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { guest: true, room: { include: { roomType: true } } },
  });
  if (!reservation) notFound();

  const [consumptions, products] = await Promise.all([
    listConsumptionsForReservation(id),
    listProducts({ includeInactive: false }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <Link
          href="/reservas"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">{reservation.guest.name}</h1>
            <p className="text-muted-foreground text-sm">
              Quarto {reservation.room.number} — {reservation.room.name} ·{" "}
              {formatDateRange(reservation.checkInDate, reservation.checkOutDate)}
            </p>
          </div>
          <ReservationStatusBadge status={reservation.status} />
        </div>
      </header>

      <ReservationConsumoTab
        userId={user.id}
        userRole={user.role}
        reservation={{
          id: reservation.id,
          guest: { id: reservation.guest.id, name: reservation.guest.name },
          room: {
            id: reservation.room.id,
            number: reservation.room.number,
            name: reservation.room.name,
          },
        }}
        consumptions={consumptions.map(serializeConsumptionForClient)}
        products={products.map(serializeProductForClient)}
      />
    </div>
  );
}
