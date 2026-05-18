import { Prisma } from "@prisma/client";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function calculateNights(checkInDate: Date, checkOutDate: Date): number {
  const checkIn = startOfDay(checkInDate);
  const checkOut = startOfDay(checkOutDate);
  const diff = Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY);
  return Math.max(diff, 0);
}

type ReservationTotalInput = {
  nights: number;
  dailyRate: Prisma.Decimal | number | string;
  discountAmount?: Prisma.Decimal | number | string | null;
};

export function calculateReservationTotal({
  nights,
  dailyRate,
  discountAmount,
}: ReservationTotalInput): Prisma.Decimal {
  if (nights < 0) {
    throw new Error("Número de noites não pode ser negativo");
  }
  const rate = new Prisma.Decimal(dailyRate);
  const discount = new Prisma.Decimal(discountAmount ?? 0);
  const subtotal = rate.mul(nights);
  const total = subtotal.sub(discount);
  return total.lessThan(0) ? new Prisma.Decimal(0) : total;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
}
