import type { RoomStatus } from "@prisma/client";

export const ROOM_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Disponível" },
  { value: "RESERVED", label: "Reservado" },
  { value: "OCCUPIED", label: "Ocupado" },
  { value: "MAINTENANCE", label: "Manutenção" },
  { value: "CLEANING", label: "Limpeza" },
  { value: "BLOCKED", label: "Bloqueado" },
] as const satisfies Array<{ value: RoomStatus; label: string }>;

export const ROOM_STATUS_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  AVAILABLE: ["RESERVED", "MAINTENANCE", "CLEANING", "BLOCKED"],
  RESERVED: ["OCCUPIED", "AVAILABLE"],
  OCCUPIED: ["AVAILABLE", "CLEANING"],
  MAINTENANCE: ["AVAILABLE"],
  CLEANING: ["AVAILABLE", "MAINTENANCE"],
  BLOCKED: ["AVAILABLE"],
};

export function getRoomStatusLabel(status: RoomStatus): string {
  return ROOM_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function isRoomStatus(value: unknown): value is RoomStatus {
  return ROOM_STATUS_OPTIONS.some((option) => option.value === value);
}

export function getAllowedNextRoomStatuses(status: RoomStatus): RoomStatus[] {
  return ROOM_STATUS_TRANSITIONS[status] ?? [];
}

export function canTransitionRoomStatus(current: RoomStatus, next: RoomStatus): boolean {
  return getAllowedNextRoomStatuses(current).includes(next);
}
