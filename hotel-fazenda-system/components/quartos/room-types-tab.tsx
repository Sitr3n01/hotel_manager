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
import { ActiveBadge, EmptyMessage, InlineTableError } from "@/components/quartos/room-list-parts";
import { RoomTypeFormDialog } from "@/components/quartos/room-type-form-dialog";
import { deactivateRoomType } from "@/lib/actions/room-type";
import { canManageRoomTypes } from "@/lib/permissions";
import type { RoomTypeForClient, RoomTypeWithCountForClient } from "@/lib/client-serialization";
import type { Role } from "@prisma/client";

type RoomTypeWithCount = RoomTypeWithCountForClient;
type RoomTypeFilter = "all" | "active" | "inactive";

type Props = {
  roomTypes: RoomTypeWithCount[];
  userRole: Role;
};

export function RoomTypesTab({ roomTypes, userRole }: Props) {
  const router = useRouter();
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RoomTypeFilter>("all");
  const canManage = canManageRoomTypes(userRole);
  const filteredTypes = useMemo(() => filterRoomTypes(roomTypes, filter), [roomTypes, filter]);

  async function handleDeactivate(roomType: RoomTypeWithCount) {
    if (
      !window.confirm(
        `Desativar o tipo ${roomType.name}? Tipos inativos não devem ser usados em novos quartos.`,
      )
    )
      return;

    setDeactivatingId(roomType.id);
    setTableError(null);
    const result = await deactivateRoomType(roomType.id);
    setDeactivatingId(null);

    if (!result.success) {
      setTableError(result.error);
      return;
    }

    router.refresh();
  }

  if (roomTypes.length === 0) {
    return <EmptyRoomTypesState canManage={canManage} onDone={() => router.refresh()} />;
  }

  return (
    <div className="space-y-4">
      <RoomTypesToolbar
        canManage={canManage}
        filter={filter}
        setFilter={setFilter}
        onDone={() => router.refresh()}
      />
      <InlineTableError message={tableError} />
      <RoomTypesTable
        canManage={canManage}
        deactivatingId={deactivatingId}
        roomTypes={filteredTypes}
        onDeactivate={handleDeactivate}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

function RoomTypesToolbar({
  canManage,
  filter,
  setFilter,
  onDone,
}: {
  canManage: boolean;
  filter: RoomTypeFilter;
  setFilter: (filter: RoomTypeFilter) => void;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Select value={filter} onValueChange={(value) => setFilter(value as RoomTypeFilter)}>
        <SelectTrigger size="sm">
          <SelectValue placeholder="Filtrar por status">
            {(value: RoomTypeFilter | null) => getRoomTypeFilterLabel(value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Ativos</SelectItem>
          <SelectItem value="inactive">Inativos</SelectItem>
        </SelectContent>
      </Select>
      {canManage ? <RoomTypeFormDialog mode="create" onDone={onDone} /> : null}
    </div>
  );
}

function RoomTypesTable({
  canManage,
  deactivatingId,
  roomTypes,
  onDeactivate,
  onDone,
}: {
  canManage: boolean;
  deactivatingId: string | null;
  roomTypes: RoomTypeWithCount[];
  onDeactivate: (roomType: RoomTypeWithCount) => void;
  onDone: () => void;
}) {
  if (roomTypes.length === 0)
    return <EmptyMessage message="Nenhum tipo de quarto com este filtro." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Capacidade</TableHead>
          <TableHead>Preço base</TableHead>
          <TableHead>Quartos</TableHead>
          <TableHead>Status</TableHead>
          {canManage ? <TableHead className="w-1" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {roomTypes.map((roomType) => (
          <RoomTypeRow
            canManage={canManage}
            deactivatingId={deactivatingId}
            key={roomType.id}
            roomType={roomType}
            onDeactivate={onDeactivate}
            onDone={onDone}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function RoomTypeRow({
  canManage,
  deactivatingId,
  roomType,
  onDeactivate,
  onDone,
}: {
  canManage: boolean;
  deactivatingId: string | null;
  roomType: RoomTypeWithCount;
  onDeactivate: (roomType: RoomTypeWithCount) => void;
  onDone: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {roomType.name}
        {roomType.description ? (
          <p className="text-muted-foreground text-xs">{roomType.description}</p>
        ) : null}
      </TableCell>
      <TableCell>{formatCapacity(roomType)}</TableCell>
      <TableCell>R$ {Number(roomType.basePrice).toFixed(2)}</TableCell>
      <TableCell>{roomType._count.rooms}</TableCell>
      <TableCell>
        <ActiveBadge active={roomType.isActive} />
      </TableCell>
      {canManage ? (
        <TableCell>
          <RoomTypeActions
            acting={deactivatingId === roomType.id}
            roomType={roomType}
            onDeactivate={onDeactivate}
            onDone={onDone}
          />
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function RoomTypeActions({
  acting,
  roomType,
  onDeactivate,
  onDone,
}: {
  acting: boolean;
  roomType: RoomTypeWithCount;
  onDeactivate: (roomType: RoomTypeWithCount) => void;
  onDone: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <RoomTypeFormDialog mode="edit" roomType={roomType} onDone={onDone} />
      {roomType.isActive ? (
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={acting}
          onClick={() => onDeactivate(roomType)}
          title="Desativar tipo de quarto"
        >
          {acting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="text-destructive h-4 w-4" />
          )}
        </Button>
      ) : null}
    </div>
  );
}

function EmptyRoomTypesState({ canManage, onDone }: { canManage: boolean; onDone: () => void }) {
  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">Nenhum tipo de quarto cadastrado.</p>
          <RoomTypeFormDialog mode="create" onDone={onDone} />
        </div>
      ) : null}
      <EmptyMessage
        message="Nenhum tipo de quarto encontrado."
        hint={canManage ? "Clique em “Novo tipo de quarto” para cadastrar." : undefined}
      />
    </div>
  );
}

function filterRoomTypes(
  roomTypes: RoomTypeWithCount[],
  filter: RoomTypeFilter,
): RoomTypeWithCount[] {
  if (filter === "all") return roomTypes;
  return roomTypes.filter((roomType) => roomType.isActive === (filter === "active"));
}

function getRoomTypeFilterLabel(value: RoomTypeFilter | null): string {
  if (value === "active") return "Ativos";
  if (value === "inactive") return "Inativos";
  return "Todos";
}

function formatCapacity(roomType: RoomTypeForClient): string {
  const max = roomType.maxCapacity > roomType.baseCapacity ? ` - ${roomType.maxCapacity}` : "";
  return `${roomType.baseCapacity}${max} pessoa(s)`;
}
