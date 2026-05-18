"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { RoomFormDialog } from "@/components/quartos/room-form-dialog";
import {
  ActiveFilter,
  RoomTypeFilter,
  SearchField,
  StatusFilter,
  type RoomFilters,
} from "@/components/quartos/room-filters";
import { ActiveBadge, EmptyMessage, InlineTableError } from "@/components/quartos/room-list-parts";
import { RoomStatusBadge } from "@/components/quartos/room-status-badge";
import { RoomSummaryCards } from "@/components/quartos/room-summary-cards";
import { changeRoomStatus, deactivateRoom } from "@/lib/actions/room";
import { canChangeRoomStatus, canManageRooms } from "@/lib/permissions";
import { getAllowedNextRoomStatuses, getRoomStatusLabel } from "@/lib/room-status";
import type { RoomTypeForClient, RoomWithTypeForClient } from "@/lib/client-serialization";
import type { Role, RoomStatus } from "@prisma/client";

type RoomWithType = RoomWithTypeForClient;

type Props = {
  rooms: RoomWithType[];
  roomTypes: RoomTypeForClient[];
  userRole: Role;
};

export function RoomsTab({ rooms, roomTypes, userRole }: Props) {
  const router = useRouter();
  const [actingId, setActingId] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RoomFilters>({
    status: "all",
    type: "all",
    active: "active",
    search: "",
  });
  const canManage = canManageRooms(userRole);
  const canChangeStatus = canChangeRoomStatus(userRole);
  const filteredRooms = useMemo(() => filterRooms(rooms, filters), [rooms, filters]);
  const summary = useMemo(() => getRoomSummary(rooms), [rooms]);

  async function runRoomAction(
    roomId: string,
    action: () => Promise<{ success: boolean; error?: string }>,
  ) {
    setActingId(roomId);
    setTableError(null);
    const result = await action();
    setActingId(null);

    if (!result.success) {
      setTableError(result.error ?? "Não foi possível executar a ação.");
      return;
    }

    router.refresh();
  }

  if (rooms.length === 0) {
    return (
      <EmptyRoomsState
        canManage={canManage}
        roomTypes={roomTypes}
        onDone={() => router.refresh()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <RoomSummaryCards summary={summary} />
      <RoomsToolbar
        canManage={canManage}
        filters={filters}
        roomTypes={roomTypes}
        setFilters={setFilters}
        onDone={() => router.refresh()}
      />
      <InlineTableError message={tableError} />
      <RoomsTable
        actingId={actingId}
        canChangeStatus={canChangeStatus}
        canManage={canManage}
        rooms={filteredRooms}
        roomTypes={roomTypes}
        onDeactivate={(room) => runRoomAction(room.id, () => deactivateRoom(room.id))}
        onStatusChange={(roomId, status) =>
          runRoomAction(roomId, () => changeRoomStatus(roomId, status))
        }
        onDone={() => router.refresh()}
      />
    </div>
  );
}

function RoomsToolbar({
  canManage,
  filters,
  roomTypes,
  setFilters,
  onDone,
}: {
  canManage: boolean;
  filters: RoomFilters;
  roomTypes: RoomTypeForClient[];
  setFilters: (next: RoomFilters) => void;
  onDone: () => void;
}) {
  const updateFilter = (key: keyof RoomFilters, value: string) =>
    setFilters({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={filters.search} onChange={(value) => updateFilter("search", value)} />
        <StatusFilter value={filters.status} onChange={(value) => updateFilter("status", value)} />
        <RoomTypeFilter
          roomTypes={roomTypes}
          value={filters.type}
          onChange={(value) => updateFilter("type", value)}
        />
        <ActiveFilter value={filters.active} onChange={(value) => updateFilter("active", value)} />
      </div>
      {canManage ? <RoomFormDialog mode="create" roomTypes={roomTypes} onDone={onDone} /> : null}
    </div>
  );
}

function RoomsTable({
  actingId,
  canChangeStatus,
  canManage,
  rooms,
  roomTypes,
  onDeactivate,
  onStatusChange,
  onDone,
}: {
  actingId: string | null;
  canChangeStatus: boolean;
  canManage: boolean;
  rooms: RoomWithType[];
  roomTypes: RoomTypeForClient[];
  onDeactivate: (room: RoomWithType) => void;
  onStatusChange: (roomId: string, status: RoomStatus) => void;
  onDone: () => void;
}) {
  if (rooms.length === 0) return <EmptyFilteredRoomsState />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Número</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ativo</TableHead>
          <TableHead className="w-1" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rooms.map((room) => (
          <RoomTableRow
            actingId={actingId}
            canChangeStatus={canChangeStatus}
            canManage={canManage}
            key={room.id}
            room={room}
            roomTypes={roomTypes}
            onDeactivate={onDeactivate}
            onStatusChange={onStatusChange}
            onDone={onDone}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function RoomTableRow(props: {
  actingId: string | null;
  canChangeStatus: boolean;
  canManage: boolean;
  room: RoomWithType;
  roomTypes: RoomTypeForClient[];
  onDeactivate: (room: RoomWithType) => void;
  onStatusChange: (roomId: string, status: RoomStatus) => void;
  onDone: () => void;
}) {
  const { room } = props;

  return (
    <TableRow>
      <TableCell className="font-medium">
        {room.name}
        {room.notes ? (
          <p className="text-muted-foreground max-w-48 truncate text-xs">{room.notes}</p>
        ) : null}
      </TableCell>
      <TableCell>{room.number}</TableCell>
      <TableCell>{room.roomType.name}</TableCell>
      <TableCell>
        <RoomStatusBadge status={room.status} />
      </TableCell>
      <TableCell>
        <ActiveBadge active={room.isActive} />
      </TableCell>
      <TableCell>
        <RoomActions {...props} />
      </TableCell>
    </TableRow>
  );
}

function RoomActions({
  actingId,
  canChangeStatus,
  canManage,
  room,
  roomTypes,
  onDeactivate,
  onStatusChange,
  onDone,
}: {
  actingId: string | null;
  canChangeStatus: boolean;
  canManage: boolean;
  room: RoomWithType;
  roomTypes: RoomTypeForClient[];
  onDeactivate: (room: RoomWithType) => void;
  onStatusChange: (roomId: string, status: RoomStatus) => void;
  onDone: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {canManage ? (
        <RoomFormDialog mode="edit" room={room} roomTypes={roomTypes} onDone={onDone} />
      ) : null}
      {canChangeStatus && room.isActive ? (
        <StatusChangeSelect room={room} onStatusChange={onStatusChange} />
      ) : null}
      {canManage && room.isActive ? (
        <DeactivateRoomButton
          acting={actingId === room.id}
          room={room}
          onDeactivate={onDeactivate}
        />
      ) : null}
    </div>
  );
}

function StatusChangeSelect({
  room,
  onStatusChange,
}: {
  room: RoomWithType;
  onStatusChange: (roomId: string, status: RoomStatus) => void;
}) {
  const nextStatuses = getAllowedNextRoomStatuses(room.status);
  const statusOptions = [room.status, ...nextStatuses];

  function handleStatusChange(value: string | null) {
    if (!value || value === room.status) return;
    if (!nextStatuses.includes(value as RoomStatus)) return;
    onStatusChange(room.id, value as RoomStatus);
  }

  return (
    <Select value={room.status} onValueChange={handleStatusChange}>
      <SelectTrigger size="sm" className="w-36">
        <SelectValue>
          {(value: RoomStatus | null) => (value ? getRoomStatusLabel(value) : "Alterar status")}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((status) => (
          <SelectItem key={status} value={status}>
            {status === room.status
              ? `${getRoomStatusLabel(status)} (atual)`
              : getRoomStatusLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DeactivateRoomButton({
  acting,
  room,
  onDeactivate,
}: {
  acting: boolean;
  room: RoomWithType;
  onDeactivate: (room: RoomWithType) => void;
}) {
  function confirmDeactivate() {
    if (
      window.confirm(
        `Remover o quarto ${room.name}? Ele será desativado e não aparecerá em novas reservas.`,
      )
    ) {
      onDeactivate(room);
    }
  }

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      disabled={acting}
      onClick={confirmDeactivate}
      title="Remover quarto"
    >
      {acting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="text-destructive h-4 w-4" />
      )}
    </Button>
  );
}

function EmptyRoomsState({
  canManage,
  roomTypes,
  onDone,
}: {
  canManage: boolean;
  roomTypes: RoomTypeForClient[];
  onDone: () => void;
}) {
  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">Nenhum quarto cadastrado.</p>
          <RoomFormDialog mode="create" roomTypes={roomTypes} onDone={onDone} />
        </div>
      ) : null}
      <EmptyMessage
        message="Nenhum quarto encontrado."
        hint={canManage ? "Clique em “Novo quarto” para cadastrar." : undefined}
      />
    </div>
  );
}

function EmptyFilteredRoomsState() {
  return <EmptyMessage message="Nenhum quarto encontrado com os filtros atuais." />;
}

function filterRooms(rooms: RoomWithType[], filters: RoomFilters): RoomWithType[] {
  return rooms.filter((room) => roomMatchesFilters(room, filters));
}

function roomMatchesFilters(room: RoomWithType, filters: RoomFilters): boolean {
  if (filters.active !== "all" && room.isActive !== (filters.active === "active")) return false;
  if (filters.status !== "all" && room.status !== filters.status) return false;
  if (filters.type !== "all" && room.roomTypeId !== filters.type) return false;
  return roomMatchesSearch(room, filters.search);
}

function roomMatchesSearch(room: RoomWithType, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return room.name.toLowerCase().includes(query) || room.number.toLowerCase().includes(query);
}

function getRoomSummary(rooms: RoomWithType[]) {
  const activeRooms = rooms.filter((room) => room.isActive);

  return {
    total: activeRooms.length,
    available: activeRooms.filter((room) => room.status === "AVAILABLE").length,
    occupied: activeRooms.filter((room) => room.status === "OCCUPIED").length,
    maintenance: activeRooms.filter(
      (room) => room.status === "MAINTENANCE" || room.status === "CLEANING",
    ).length,
    blocked: activeRooms.filter((room) => room.status === "BLOCKED").length,
  };
}
