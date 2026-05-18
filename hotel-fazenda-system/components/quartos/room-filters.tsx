"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRoomStatusLabel, ROOM_STATUS_OPTIONS } from "@/lib/room-status";
import type { RoomTypeForClient } from "@/lib/client-serialization";
import type { RoomStatus } from "@prisma/client";

export type RoomFilters = {
  status: string;
  type: string;
  active: string;
  search: string;
};

export function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
      <Input
        placeholder="Buscar por nome ou número..."
        className="h-8 w-56 pl-8 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function StatusFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? "all")}>
      <SelectTrigger size="sm">
        <SelectValue placeholder="Status">
          {(current: string | null) =>
            current === "all"
              ? "Todos os status"
              : current
                ? getRoomStatusLabel(current as RoomStatus)
                : "Status"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os status</SelectItem>
        {ROOM_STATUS_OPTIONS.map((status) => (
          <SelectItem key={status.value} value={status.value}>
            {status.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function RoomTypeFilter({
  roomTypes,
  value,
  onChange,
}: {
  roomTypes: RoomTypeForClient[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? "all")}>
      <SelectTrigger size="sm">
        <SelectValue placeholder="Tipo">
          {(current: string | null) =>
            current === "all"
              ? "Todos os tipos"
              : (roomTypes.find((roomType) => roomType.id === current)?.name ?? "Tipo")
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os tipos</SelectItem>
        {roomTypes.map((roomType) => (
          <SelectItem key={roomType.id} value={roomType.id}>
            {roomType.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ActiveFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? "active")}>
      <SelectTrigger size="sm">
        <SelectValue placeholder="Ativo/Inativo">
          {(current: string | null) => getActiveFilterLabel(current)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        <SelectItem value="active">Ativos</SelectItem>
        <SelectItem value="inactive">Inativos</SelectItem>
      </SelectContent>
    </Select>
  );
}

function getActiveFilterLabel(value: string | null): string {
  if (value === "all") return "Todos";
  if (value === "inactive") return "Inativos";
  return "Ativos";
}
