"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import {
  canAdjustStock,
  canRegisterInternalConsumption,
  canRegisterPurchase,
  canRegisterWaste,
  canViewProducts,
} from "@/lib/permissions";
import {
  adjustmentSchema,
  internalConsumptionSchema,
  purchaseSchema,
  wasteSchema,
  type AdjustmentInput,
  type InternalConsumptionInput,
  type PurchaseInput,
  type WasteInput,
} from "@/lib/validations/stock-movement";
import { calculateNewAverageCost, unitCostFromBatch } from "@/lib/inventory/cost";
import { Prisma, type MovementType, type StockMovement } from "@prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

type ListParams = {
  type?: MovementType;
  productId?: string;
  from?: Date;
  to?: Date;
};

export async function listStockMovements(params?: ListParams) {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!canViewProducts(user)) return [];

  return prisma.stockMovement.findMany({
    where: buildMovementWhere(params),
    orderBy: { createdAt: "desc" },
    include: {
      product: { include: { category: true } },
      createdBy: { select: { id: true, name: true, role: true } },
      reservation: { include: { guest: { select: { name: true } } } },
    },
    take: 500,
  });
}

export async function createPurchase(input: PurchaseInput): Promise<ActionResult<StockMovement[]>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!canRegisterPurchase(user)) {
    return { success: false, error: "Sem permissão para registrar compras" };
  }

  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const movements = await prisma.$transaction(async (tx) => {
      const created: StockMovement[] = [];
      for (const item of parsed.data.items) {
        const unitCost = unitCostFromBatch(item.totalCost, item.quantity);
        const movement = await applyMovement(tx, {
          productId: item.productId,
          type: "IN",
          quantity: new Prisma.Decimal(item.quantity),
          unitCostForIn: unitCost,
          reason: parsed.data.reason || null,
          createdById: user.id,
        });
        created.push(movement);
      }
      return created;
    });

    for (const m of movements) {
      await logAudit({
        actorId: user.id,
        action: "STOCK_IN",
        entity: "StockMovement",
        entityId: m.id,
        afterData: m,
      });
    }
    revalidatePath("/estoque");
    return { success: true, data: movements };
  } catch (error) {
    return toMovementError(error);
  }
}

export async function createInternalConsumption(
  input: InternalConsumptionInput,
): Promise<ActionResult<StockMovement>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!canRegisterInternalConsumption(user)) {
    return { success: false, error: "Sem permissão para registrar consumo interno" };
  }
  return runSimpleMovement(input, internalConsumptionSchema, {
    type: "INTERNAL_CONSUMPTION",
    action: "INTERNAL_CONSUMPTION",
    userId: user.id,
  });
}

export async function createWaste(input: WasteInput): Promise<ActionResult<StockMovement>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!canRegisterWaste(user)) {
    return { success: false, error: "Sem permissão para registrar desperdício" };
  }
  return runSimpleMovement(input, wasteSchema, {
    type: "WASTE",
    action: "WASTE",
    userId: user.id,
  });
}

export async function createAdjustment(
  input: AdjustmentInput,
): Promise<ActionResult<StockMovement>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!canAdjustStock(user)) {
    return { success: false, error: "Sem permissão para ajustar estoque" };
  }
  const parsed = adjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const type: MovementType =
    parsed.data.direction === "POSITIVE" ? "POSITIVE_ADJUSTMENT" : "NEGATIVE_ADJUSTMENT";
  const action =
    parsed.data.direction === "POSITIVE" ? "ADJUSTMENT_POSITIVE" : "ADJUSTMENT_NEGATIVE";

  try {
    const movement = await prisma.$transaction(async (tx) =>
      applyMovement(tx, {
        productId: parsed.data.productId,
        type,
        quantity: new Prisma.Decimal(parsed.data.quantity),
        reason: parsed.data.reason,
        createdById: user.id,
      }),
    );
    await logAudit({
      actorId: user.id,
      action,
      entity: "StockMovement",
      entityId: movement.id,
      afterData: movement,
      metadata: { reason: parsed.data.reason },
    });
    revalidatePath("/estoque");
    return { success: true, data: movement };
  } catch (error) {
    return toMovementError(error);
  }
}

type SimpleMovementInput = InternalConsumptionInput | WasteInput;
type SimpleMovementOptions = {
  type: MovementType;
  action: "INTERNAL_CONSUMPTION" | "WASTE";
  userId: string;
};

async function runSimpleMovement<I extends SimpleMovementInput>(
  input: I,
  schema: {
    safeParse: (
      i: unknown,
    ) =>
      | { success: true; data: I }
      | { success: false; error: { flatten: () => { fieldErrors: Record<string, string[]> } } };
  },
  opts: SimpleMovementOptions,
): Promise<ActionResult<StockMovement>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    const movement = await prisma.$transaction(async (tx) =>
      applyMovement(tx, {
        productId: parsed.data.productId,
        type: opts.type,
        quantity: new Prisma.Decimal(parsed.data.quantity),
        reason: parsed.data.reason || null,
        createdById: opts.userId,
      }),
    );
    await logAudit({
      actorId: opts.userId,
      action: opts.action,
      entity: "StockMovement",
      entityId: movement.id,
      afterData: movement,
      metadata: parsed.data.reason ? { reason: parsed.data.reason } : undefined,
    });
    revalidatePath("/cozinha");
    revalidatePath("/estoque");
    return { success: true, data: movement };
  } catch (error) {
    return toMovementError(error);
  }
}

type MovementArgs = {
  productId: string;
  type: MovementType;
  quantity: Prisma.Decimal;
  unitCostForIn?: Prisma.Decimal;
  reservationId?: string | null;
  reason?: string | null;
  createdById: string;
  idempotencyKey?: string;
  origin?: string;
};

export async function applyMovement(
  tx: Prisma.TransactionClient,
  args: MovementArgs,
): Promise<StockMovement> {
  const product = await tx.product.findUnique({ where: { id: args.productId } });
  if (!product) throw new Error("Produto não encontrado");
  if (!product.isActive) throw new Error("Produto inativo não aceita movimentações");

  const isAdditive = args.type === "IN" || args.type === "POSITIVE_ADJUSTMENT";
  const newStock = isAdditive
    ? product.currentStock.plus(args.quantity)
    : product.currentStock.minus(args.quantity);
  assertStockDoesNotGoNegative(isAdditive, newStock, product.name);

  let estimatedCost: Prisma.Decimal;
  let newAverageCost = product.averageCost;

  if (args.type === "IN") {
    if (!args.unitCostForIn) throw new Error("Custo unitário obrigatório para entrada");
    estimatedCost = args.unitCostForIn.mul(args.quantity);
    newAverageCost = calculateNewAverageCost(
      product.currentStock,
      product.averageCost,
      args.quantity,
      args.unitCostForIn,
    );
  } else {
    estimatedCost = args.quantity.mul(product.averageCost);
  }

  const movement = await tx.stockMovement.create({
    data: {
      productId: args.productId,
      reservationId: args.reservationId ?? null,
      type: args.type,
      quantity: args.quantity,
      estimatedCost,
      reason: args.reason ?? null,
      createdById: args.createdById,
      idempotencyKey: args.idempotencyKey,
      origin: args.origin,
    },
  });

  await tx.product.update({
    where: { id: args.productId },
    data: { currentStock: newStock, averageCost: newAverageCost },
  });

  return movement;
}

function assertStockDoesNotGoNegative(
  isAdditive: boolean,
  newStock: Prisma.Decimal,
  productName: string,
): void {
  if (!isAdditive && newStock.lt(0)) {
    throw new Error(`Estoque insuficiente para ${productName}`);
  }
}

function buildMovementWhere(params?: ListParams): Prisma.StockMovementWhereInput {
  return {
    ...(params?.type ? { type: params.type } : {}),
    ...(params?.productId ? { productId: params.productId } : {}),
    ...buildMovementDateFilter(params),
  };
}

function buildMovementDateFilter(params?: ListParams): Prisma.StockMovementWhereInput {
  if (!params?.from && !params?.to) return {};
  return {
    createdAt: {
      ...(params.from ? { gte: params.from } : {}),
      ...(params.to ? { lte: params.to } : {}),
    },
  };
}

function toMovementError(error: unknown): ActionResult<never> {
  if (error instanceof Error && error.message) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "Não foi possível registrar a movimentação." };
}
