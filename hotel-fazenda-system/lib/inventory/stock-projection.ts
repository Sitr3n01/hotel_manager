import { Prisma } from "@prisma/client";
import type { MovementType } from "@prisma/client";

type DecimalInput = Prisma.Decimal | number | string;

const ADDITIVE: ReadonlySet<MovementType> = new Set(["IN", "POSITIVE_ADJUSTMENT"]);
const SUBTRACTIVE: ReadonlySet<MovementType> = new Set([
  "RESERVATION_CONSUMPTION",
  "INTERNAL_CONSUMPTION",
  "WASTE",
  "NEGATIVE_ADJUSTMENT",
]);

export function projectStockAfterMovement(
  currentStock: DecimalInput,
  type: MovementType,
  quantity: DecimalInput,
): Prisma.Decimal {
  const c = new Prisma.Decimal(currentStock);
  const q = new Prisma.Decimal(quantity);
  if (q.lessThan(0)) {
    throw new Error("Quantidade não pode ser negativa");
  }

  if (ADDITIVE.has(type)) return c.plus(q);
  if (SUBTRACTIVE.has(type)) return c.minus(q);

  throw new Error(`Tipo de movimento desconhecido: ${type}`);
}

export function willStockGoNegative(
  currentStock: DecimalInput,
  type: MovementType,
  quantity: DecimalInput,
): boolean {
  return projectStockAfterMovement(currentStock, type, quantity).lessThan(0);
}
