import type { OperationStatus, OperationType } from "./types";

export const OPERATION_LABEL: Record<OperationType, string> = {
  STOCK_PURCHASE_CREATE: "Entrada de estoque (compra)",
  INTERNAL_CONSUMPTION_CREATE: "Consumo interno",
  WASTE_CREATE: "Desperdício",
  RESERVATION_CONSUMPTION_CREATE: "Consumo de hóspede",
  PRE_RESERVATION_CREATE: "Pré-reserva",
};

export const STATUS_LABEL: Record<OperationStatus, string> = {
  PENDING: "Pendente",
  SYNCING: "Sincronizando",
  SYNCED: "Sincronizado",
  FAILED: "Falhou",
  CONFLICT: "Conflito",
};

export function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
