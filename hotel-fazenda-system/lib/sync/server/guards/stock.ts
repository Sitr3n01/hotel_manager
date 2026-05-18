import "server-only";
import type { Prisma } from "@prisma/client";
import { ConflictError } from "../errors";

// Loads product fresh inside the transaction and asserts that an outbound
// movement of `quantity` units is still feasible. Raises ConflictError so
// the dispatcher maps to result = CONFLICT (not an APPLIED row).
export async function loadActiveProduct(
  tx: Prisma.TransactionClient,
  productId: string,
) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ConflictError("Produto não encontrado");
  }
  if (!product.isActive) {
    throw new ConflictError("Produto foi inativado após o registro offline");
  }
  return product;
}

export function assertStockAvailable(
  current: Prisma.Decimal,
  outbound: Prisma.Decimal,
  productName: string,
): void {
  if (current.lessThan(outbound)) {
    throw new ConflictError(
      `Estoque insuficiente de ${productName}: disponível ${current.toString()}, tentou retirar ${outbound.toString()}`,
    );
  }
}
