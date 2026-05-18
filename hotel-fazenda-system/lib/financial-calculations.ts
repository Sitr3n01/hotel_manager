import { Prisma } from "@prisma/client";

export function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  if (diffMs < 0) throw new Error("Check-out deve ser posterior ao check-in");
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function calculateDailyTotal(
  nights: number,
  dailyRate: Prisma.Decimal,
): Prisma.Decimal {
  return new Prisma.Decimal(nights).mul(dailyRate);
}

export function calculateConsumptionTotal(
  items: { quantity: Prisma.Decimal; unitPrice: Prisma.Decimal }[],
): Prisma.Decimal {
  return items.reduce((sum, item) => {
    return sum.add(item.quantity.mul(item.unitPrice));
  }, new Prisma.Decimal(0));
}

export function calculateFinalTotal(
  dailyTotal: Prisma.Decimal,
  consumptionTotal: Prisma.Decimal,
  discountTotal: Prisma.Decimal,
  extraTotal: Prisma.Decimal,
): Prisma.Decimal {
  const result = dailyTotal
    .add(consumptionTotal)
    .sub(discountTotal)
    .add(extraTotal);
  return result.lessThan(0) ? new Prisma.Decimal(0) : result;
}

export function formatCurrency(value: Prisma.Decimal): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value.toNumber());
}
