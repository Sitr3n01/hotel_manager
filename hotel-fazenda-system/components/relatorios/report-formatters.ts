export type NumberLike = number | { toNumber: () => number };

export function toNumber(value: NumberLike): number {
  return typeof value === "number" ? value : value.toNumber();
}

export function formatCurrency(value: NumberLike): string {
  return toNumber(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDecimal(value: NumberLike): string {
  return toNumber(value).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export function textOrDash(value: string | null | undefined): string {
  return value?.trim() ? value : "-";
}
