import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const { getCurrentUser, logAudit, revalidatePath, prismaMock, txMock } = vi.hoisted(() => {
  const product = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const stockMovement = {
    create: vi.fn(),
    findMany: vi.fn(),
  };
  const tx = { product, stockMovement };
  return {
    getCurrentUser: vi.fn(),
    logAudit: vi.fn(),
    revalidatePath: vi.fn(),
    prismaMock: {
      product,
      stockMovement,
      $transaction: vi.fn(async (fn: (txArg: typeof tx) => unknown) => fn(tx)),
    },
    txMock: tx,
  };
});

vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser }));
vi.mock("@/lib/audit", () => ({ logAudit }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  createPurchase,
  createInternalConsumption,
  createWaste,
  createAdjustment,
} from "@/lib/actions/stock-movement";

const ADMIN = {
  id: "actor-1",
  role: "ADMIN" as const,
  isActive: true,
  email: "admin@local",
  name: "Admin",
  authUserId: "auth-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const COZINHA = { ...ADMIN, id: "user-cozinha", role: "COZINHA" as const };
const SECRETARIA = { ...ADMIN, id: "user-sec", role: "SECRETARIA" as const };
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

const PRODUCT_ROW = {
  id: VALID_UUID,
  name: "Água mineral 500ml",
  categoryId: VALID_UUID,
  unit: "UNIT",
  averageCost: new Prisma.Decimal("2.00"),
  salePrice: null,
  currentStock: new Prisma.Decimal("10.000"),
  minimumStock: new Prisma.Decimal("0.000"),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  txMock.product.findUnique.mockResolvedValue(PRODUCT_ROW);
  txMock.product.update.mockResolvedValue(PRODUCT_ROW);
  txMock.stockMovement.create.mockImplementation(({ data }: { data: unknown }) =>
    Promise.resolve({ id: "mov-1", ...(data as object) }),
  );
});

describe("createPurchase", () => {
  it("blocks COZINHA-only purchase when role lacks permission", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    const r = await createPurchase({
      items: [{ productId: VALID_UUID, quantity: 10, totalCost: 30 }],
    });
    expect(r.success).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("creates IN movement and updates product (weighted avg)", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    const r = await createPurchase({
      items: [{ productId: VALID_UUID, quantity: 10, totalCost: 30 }],
    });
    expect(r.success).toBe(true);
    expect(txMock.stockMovement.create).toHaveBeenCalledOnce();
    expect(txMock.product.update).toHaveBeenCalledOnce();
    const updateCall = txMock.product.update.mock.calls[0][0] as {
      data: { currentStock: Prisma.Decimal; averageCost: Prisma.Decimal };
    };
    // Existing: 10 @ R$2.00. Adding 10 @ R$3.00. New avg = (10*2 + 10*3)/20 = 2.5
    expect(updateCall.data.currentStock.toString()).toBe("20");
    expect(updateCall.data.averageCost.toString()).toBe("2.5");
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "STOCK_IN", entity: "StockMovement" }),
    );
  });

  it("processes multi-item purchase in single transaction", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    const r = await createPurchase({
      items: [
        { productId: VALID_UUID, quantity: 5, totalCost: 10 },
        { productId: VALID_UUID, quantity: 3, totalCost: 9 },
      ],
    });
    expect(r.success).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(txMock.stockMovement.create).toHaveBeenCalledTimes(2);
  });
});

describe("createWaste", () => {
  it("requires reason (Zod block when missing)", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);
    const r = await createWaste({
      productId: VALID_UUID,
      quantity: 1,
    } as unknown as Parameters<typeof createWaste>[0]);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.fieldErrors?.reason).toBeDefined();
  });

  it("decrements stock and logs audit with reason", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);
    const r = await createWaste({
      productId: VALID_UUID,
      quantity: 0.5,
      reason: "Produto vencido",
    });
    expect(r.success).toBe(true);
    const updateCall = txMock.product.update.mock.calls[0][0] as {
      data: { currentStock: Prisma.Decimal };
    };
    expect(updateCall.data.currentStock.toString()).toBe("9.5");
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "WASTE",
        metadata: { reason: "Produto vencido" },
      }),
    );
  });

  it("blocks stock from going negative", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);
    const r = await createWaste({
      productId: VALID_UUID,
      quantity: 15,
      reason: "Caixa toda perdida",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/Estoque insuficiente/);
    expect(txMock.product.update).not.toHaveBeenCalled();
  });
});

describe("createInternalConsumption", () => {
  it("decrements stock without requiring reason", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);
    const r = await createInternalConsumption({ productId: VALID_UUID, quantity: 1.5 });
    expect(r.success).toBe(true);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "INTERNAL_CONSUMPTION" }),
    );
  });
});

describe("createAdjustment", () => {
  it("requires GERENCIA+ role", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);
    const r = await createAdjustment({
      productId: VALID_UUID,
      quantity: 1,
      direction: "POSITIVE",
      reason: "Recontagem física",
    });
    expect(r.success).toBe(false);
  });

  it("POSITIVE direction increases stock", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    const r = await createAdjustment({
      productId: VALID_UUID,
      quantity: 3,
      direction: "POSITIVE",
      reason: "Recontagem: sobrou",
    });
    expect(r.success).toBe(true);
    const updateCall = txMock.product.update.mock.calls[0][0] as {
      data: { currentStock: Prisma.Decimal };
    };
    expect(updateCall.data.currentStock.toString()).toBe("13");
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ADJUSTMENT_POSITIVE" }),
    );
  });

  it("NEGATIVE direction decreases stock", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    const r = await createAdjustment({
      productId: VALID_UUID,
      quantity: 2,
      direction: "NEGATIVE",
      reason: "Recontagem: faltou",
    });
    expect(r.success).toBe(true);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ADJUSTMENT_NEGATIVE" }),
    );
  });
});

describe("RBAC unauthenticated", () => {
  it("blocks all four actions when no user", async () => {
    getCurrentUser.mockResolvedValue(null);
    const r1 = await createPurchase({
      items: [{ productId: VALID_UUID, quantity: 1, totalCost: 1 }],
    });
    const r2 = await createWaste({ productId: VALID_UUID, quantity: 1, reason: "x..." });
    const r3 = await createInternalConsumption({ productId: VALID_UUID, quantity: 1 });
    const r4 = await createAdjustment({
      productId: VALID_UUID,
      quantity: 1,
      direction: "POSITIVE",
      reason: "Recontagem física",
    });
    expect([r1.success, r2.success, r3.success, r4.success]).toEqual([false, false, false, false]);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
