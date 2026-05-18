import { Prisma } from "@prisma/client";

type DecimalInput = Prisma.Decimal | number | string;

export function calculateNewAverageCost(
  existingQty: DecimalInput,
  existingAverage: DecimalInput,
  addedQty: DecimalInput,
  addedUnitCost: DecimalInput,
): Prisma.Decimal {
  const eq = new Prisma.Decimal(existingQty);
  const ea = new Prisma.Decimal(existingAverage);
  const aq = new Prisma.Decimal(addedQty);
  const au = new Prisma.Decimal(addedUnitCost);

  if (aq.lessThanOrEqualTo(0)) {
    throw new Error("Quantidade adicionada deve ser positiva");
  }
  if (au.lessThan(0)) {
    throw new Error("Custo unitário não pode ser negativo");
  }

  const newQty = eq.plus(aq);
  if (newQty.lessThanOrEqualTo(0)) return new Prisma.Decimal(0);

  return eq.mul(ea).plus(aq.mul(au)).dividedBy(newQty);
}

export function unitCostFromBatch(
  totalCost: DecimalInput,
  quantity: DecimalInput,
): Prisma.Decimal {
  const t = new Prisma.Decimal(totalCost);
  const q = new Prisma.Decimal(quantity);
  if (q.lessThanOrEqualTo(0)) {
    throw new Error("Quantidade deve ser positiva");
  }
  return t.dividedBy(q);
}
