import type { ReservationStatus } from "@prisma/client";

export const RESERVATION_STATUS_OPTIONS = [
  { value: "PRE_RESERVED", label: "Pré-reserva" },
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "CHECKED_IN", label: "Hospedada" },
  { value: "CHECKED_OUT", label: "Finalizada" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "NO_SHOW", label: "No-show" },
] as const satisfies Array<{ value: ReservationStatus; label: string }>;

export const RESERVATION_STATUS_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PRE_RESERVED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["CHECKED_OUT"],
  CHECKED_OUT: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const RESERVATION_OCCUPYING_STATUSES: readonly ReservationStatus[] = [
  "PRE_RESERVED",
  "CONFIRMED",
  "CHECKED_IN",
] as const;

export const RESERVATION_TERMINAL_STATUSES: readonly ReservationStatus[] = [
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
] as const;

export function getReservationStatusLabel(status: ReservationStatus): string {
  return RESERVATION_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function getAllowedNextReservationStatuses(status: ReservationStatus): ReservationStatus[] {
  return RESERVATION_STATUS_TRANSITIONS[status] ?? [];
}

export function canTransitionReservationStatus(
  current: ReservationStatus,
  next: ReservationStatus,
): boolean {
  return getAllowedNextReservationStatuses(current).includes(next);
}

export function isReservationOccupying(status: ReservationStatus): boolean {
  return RESERVATION_OCCUPYING_STATUSES.includes(status);
}

export function isReservationTerminal(status: ReservationStatus): boolean {
  return RESERVATION_TERMINAL_STATUSES.includes(status);
}
