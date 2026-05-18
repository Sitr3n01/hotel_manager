"use client";

import { useRouter } from "next/navigation";
import { CalendarRange, ListChecks } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReservationsListTab } from "@/components/reservas/reservations-list-tab";
import { ReservationsTimelineTab } from "@/components/reservas/timeline/reservations-timeline-tab";
import { PreReservaOfflineDialog } from "@/components/reservas/pre-reserva-offline-dialog";
import { canManageReservations } from "@/lib/permissions";
import type { ReservationsSummary } from "@/components/reservas/reservation-summary-cards";
import type {
  ReservationWithRelationsForClient,
  RoomWithTypeForClient,
} from "@/lib/client-serialization";
import type { Guest, Role } from "@prisma/client";

type Props = {
  userId: string;
  userRole: Role;
  reservations: ReservationWithRelationsForClient[];
  guests: Guest[];
  rooms: RoomWithTypeForClient[];
  summary: ReservationsSummary;
};

export function ReservasPageClient({
  userId,
  userRole,
  reservations,
  guests,
  rooms,
  summary,
}: Props) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight">Reservas</h1>
          <p className="text-muted-foreground text-sm">
            Criação, check-in, check-out e visualização da ocupação.
          </p>
        </div>
        {canManageReservations(userRole) ? (
          <PreReservaOfflineDialog
            rooms={rooms}
            userId={userId}
            onDone={() => router.refresh()}
          />
        ) : null}
      </header>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">
            <ListChecks className="h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <CalendarRange className="h-4 w-4" />
            Linha do tempo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="pt-4">
          <ReservationsListTab
            reservations={reservations}
            guests={guests}
            rooms={rooms}
            userRole={userRole}
            summary={summary}
          />
        </TabsContent>

        <TabsContent value="timeline" className="pt-4">
          <ReservationsTimelineTab
            reservations={reservations}
            guests={guests}
            rooms={rooms}
            userRole={userRole}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
