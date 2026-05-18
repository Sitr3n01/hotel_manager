"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyMessage, InlineTableError } from "@/components/shared/list-parts";
import { ReservationFormDialog } from "@/components/reservas/reservation-form-dialog";
import { ReservationStatusBadge } from "@/components/reservas/reservation-status-badge";
import { ReservationActions } from "@/components/reservas/reservation-actions";
import {
  ReservationSummaryCards,
  type ReservationsSummary,
} from "@/components/reservas/reservation-summary-cards";
import { calculateNights, calculateReservationTotal } from "@/lib/pricing";
import { canManageReservations } from "@/lib/permissions";
import { formatDate } from "@/lib/date-format";
import { getReservationStatusLabel, RESERVATION_STATUS_OPTIONS } from "@/lib/reservation-status";
import type {
  ReservationWithRelationsForClient,
  RoomWithTypeForClient,
} from "@/lib/client-serialization";
import type { Guest, ReservationStatus, Role } from "@prisma/client";

type RoomWithType = RoomWithTypeForClient;
type ReservationWithRelations = ReservationWithRelationsForClient;

type Props = {
  reservations: ReservationWithRelations[];
  guests: Guest[];
  rooms: RoomWithType[];
  userRole: Role;
  summary: ReservationsSummary;
};

type Filters = {
  status: string;
  search: string;
  from: string;
  to: string;
};

export function ReservationsListTab({ reservations, guests, rooms, userRole, summary }: Props) {
  const router = useRouter();
  const [tableError, setTableError] = useState<string>("");
  const [filters, setFilters] = useState<Filters>({
    status: "active",
    search: "",
    from: "",
    to: "",
  });
  const canManage = canManageReservations(userRole);
  const filtered = useMemo(
    () => filterReservations(reservations, filters),
    [reservations, filters],
  );

  return (
    <div className="space-y-4">
      <ReservationSummaryCards summary={summary} />
      <Toolbar
        canManage={canManage}
        filters={filters}
        setFilters={setFilters}
        guests={guests}
        rooms={rooms}
        onDone={() => router.refresh()}
      />
      <InlineTableError message={tableError || null} />
      {reservations.length === 0 ? (
        <EmptyState canManage={canManage} />
      ) : (
        <ReservationsTable
          reservations={filtered}
          guests={guests}
          rooms={rooms}
          userRole={userRole}
          onError={setTableError}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  );
}

function Toolbar({
  canManage,
  filters,
  setFilters,
  guests,
  rooms,
  onDone,
}: {
  canManage: boolean;
  filters: Filters;
  setFilters: (next: Filters) => void;
  guests: Guest[];
  rooms: RoomWithType[];
  onDone: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar hóspede, documento ou quarto..."
            className="h-8 w-72 pl-8 text-sm"
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          />
        </div>
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ ...filters, status: value ?? "all" })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Status">
              {(value: string | null) => getReservationFilterLabel(value)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativas (não finalizadas)</SelectItem>
            {RESERVATION_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Filtrar reservas a partir de"
          className="h-8 w-36 text-sm"
          type="date"
          value={filters.from}
          onChange={(event) => setFilters({ ...filters, from: event.target.value })}
        />
        <Input
          aria-label="Filtrar reservas até"
          className="h-8 w-36 text-sm"
          type="date"
          value={filters.to}
          onChange={(event) => setFilters({ ...filters, to: event.target.value })}
        />
      </div>
      {canManage ? (
        <ReservationFormDialog mode="create" guests={guests} rooms={rooms} onDone={onDone} />
      ) : null}
    </div>
  );
}

function ReservationsTable({
  reservations,
  guests,
  rooms,
  userRole,
  onError,
  onDone,
}: {
  reservations: ReservationWithRelations[];
  guests: Guest[];
  rooms: RoomWithType[];
  userRole: Role;
  onError: (message: string) => void;
  onDone: () => void;
}) {
  if (reservations.length === 0) {
    return <EmptyMessage message="Nenhuma reserva com os filtros atuais." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hóspede</TableHead>
          <TableHead>Quarto</TableHead>
          <TableHead>Check-in</TableHead>
          <TableHead>Check-out</TableHead>
          <TableHead>Noites</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-1" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {reservations.map((reservation) => (
          <ReservationRow
            key={reservation.id}
            reservation={reservation}
            guests={guests}
            rooms={rooms}
            userRole={userRole}
            onError={onError}
            onDone={onDone}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function ReservationRow({
  reservation,
  guests,
  rooms,
  userRole,
  onError,
  onDone,
}: {
  reservation: ReservationWithRelations;
  guests: Guest[];
  rooms: RoomWithType[];
  userRole: Role;
  onError: (message: string) => void;
  onDone: () => void;
}) {
  const nights = calculateNights(reservation.checkInDate, reservation.checkOutDate);
  const total = calculateReservationTotal({
    nights,
    dailyRate: reservation.dailyRate,
    discountAmount: reservation.discountAmount,
  });
  const canEdit = canManageReservations(userRole) && !isTerminal(reservation.status);

  return (
    <TableRow>
      <TableCell className="font-medium">
        {reservation.guest.name}
        {reservation.guest.document ? (
          <p className="text-muted-foreground text-xs">{reservation.guest.document}</p>
        ) : null}
      </TableCell>
      <TableCell>
        {reservation.room.number} · {reservation.room.name}
        <p className="text-muted-foreground text-xs">{reservation.room.roomType.name}</p>
      </TableCell>
      <TableCell>{formatDate(reservation.checkInDate)}</TableCell>
      <TableCell>{formatDate(reservation.checkOutDate)}</TableCell>
      <TableCell>{nights}</TableCell>
      <TableCell>R$ {total.toString()}</TableCell>
      <TableCell>
        <ReservationStatusBadge status={reservation.status} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {canEdit ? (
            <ReservationFormDialog
              mode="edit"
              reservation={reservation}
              guests={guests}
              rooms={rooms}
              onDone={onDone}
            />
          ) : null}
          <ReservationActions reservation={reservation} userRole={userRole} onError={onError} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function EmptyState({ canManage }: { canManage: boolean }) {
  return (
    <EmptyMessage
      message="Nenhuma reserva encontrada."
      hint={canManage ? "Clique em “Nova reserva” para começar." : undefined}
    />
  );
}

function getReservationFilterLabel(value: string | null): string {
  if (value === "all") return "Todos os status";
  if (value === "active") return "Ativas";
  if (!value) return "Status";
  return getReservationStatusLabel(value as ReservationStatus);
}

function filterReservations(
  reservations: ReservationWithRelations[],
  filters: Filters,
): ReservationWithRelations[] {
  return reservations.filter(
    (reservation) =>
      matchesStatus(reservation, filters.status) &&
      matchesSearch(reservation, filters.search) &&
      matchesPeriod(reservation, filters),
  );
}

function matchesStatus(reservation: ReservationWithRelations, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "active") return !isTerminal(reservation.status);
  return reservation.status === filter;
}

function matchesSearch(reservation: ReservationWithRelations, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return (
    reservation.guest.name.toLowerCase().includes(query) ||
    (reservation.guest.document?.toLowerCase().includes(query) ?? false) ||
    reservation.room.number.toLowerCase().includes(query) ||
    reservation.room.name.toLowerCase().includes(query)
  );
}

function matchesPeriod(reservation: ReservationWithRelations, filters: Filters): boolean {
  const from = parseDateInput(filters.from, "start");
  const to = parseDateInput(filters.to, "end");
  if (from && reservation.checkOutDate < from) return false;
  if (to && reservation.checkInDate > to) return false;
  return true;
}

function parseDateInput(value: string, boundary: "start" | "end"): Date | null {
  if (!value) return null;
  const suffix = boundary === "start" ? "T00:00:00" : "T23:59:59";
  return new Date(`${value}${suffix}`);
}

function isTerminal(status: ReservationStatus): boolean {
  return status === "CHECKED_OUT" || status === "CANCELLED" || status === "NO_SHOW";
}
