import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const { getCurrentUser, logAudit, revalidatePath, applyMovement, prismaMock, txMock } = vi.hoisted(
  () => {
    const reservationConsumption = {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    };
    const tx = { reservationConsumption };
    const runTransaction = vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx));
    return {
      getCurrentUser: vi.fn(),
      logAudit: vi.fn(),
      revalidatePath: vi.fn(),
      applyMovement: vi.fn(),
      prismaMock: {
        reservationConsumption,
        reservation: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
        },
        $transaction: runTransaction,
      },
      txMock: tx,
    };
  },
);

vi.mock("@/lib/auth/get-current-user", function authMock() {
  return { getCurrentUser };
});
vi.mock("@/lib/audit", function auditMock() {
  return { logAudit };
});
vi.mock("next/cache", function cacheMock() {
  return { revalidatePath };
});
vi.mock("@/lib/prisma", function prismaModuleMock() {
  return { prisma: prismaMock };
});
vi.mock("@/lib/actions/stock-movement", function stockMovementMock() {
  return { applyMovement };
});

import {
  createReservationConsumption,
  deleteReservationConsumption,
  listConsumptionsForReservation,
  listReservationsForConsumption,
} from "@/lib/actions/reservation-consumption";

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
const COZINHA = { ...ADMIN, id: "u-cozinha", role: "COZINHA" as const };
const SECRETARIA = { ...ADMIN, id: "u-sec", role: "SECRETARIA" as const };
const FINANCEIRO = { ...ADMIN, id: "u-fin", role: "FINANCEIRO" as const };

const RES_UUID = "550e8400-e29b-41d4-a716-446655440000";
const PROD_UUID = "550e8400-e29b-41d4-a716-446655440001";

const ACTIVE_RES = {
  id: RES_UUID,
  status: "CHECKED_IN",
  closing: null,
};

const TERMINAL_CANCELLED = { ...ACTIVE_RES, status: "CANCELLED" };
const CLOSED = { ...ACTIVE_RES, closing: { closedAt: new Date() } };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.reservation.findUnique.mockResolvedValue(ACTIVE_RES);
  prismaMock.reservation.findMany.mockResolvedValue([]);
  txMock.reservationConsumption.create.mockImplementation(({ data }: { data: unknown }) =>
    Promise.resolve({ id: "cons-1", ...(data as object) }),
  );
});

describe("listReservationsForConsumption", () => {
  it("allows COZINHA to load the light reservation list for guest consumption", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);
    prismaMock.reservation.findMany.mockResolvedValue([{ id: RES_UUID }]);

    const result = await listReservationsForConsumption();

    expect(result).toEqual([{ id: RES_UUID }]);
    expect(prismaMock.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          guest: expect.any(Object),
          room: expect.any(Object),
        }),
      }),
    );
  });

  it("blocks roles that cannot register reservation consumption", async () => {
    getCurrentUser.mockResolvedValue({ ...ADMIN, role: "FINANCEIRO" as const });

    const result = await listReservationsForConsumption();

    expect(result).toEqual([]);
    expect(prismaMock.reservation.findMany).not.toHaveBeenCalled();
  });
});

describe("createReservationConsumption", () => {
  it("blocks unauthenticated", async () => {
    getCurrentUser.mockResolvedValue(null);
    const r = await createReservationConsumption({
      reservationId: RES_UUID,
      description: "Refri",
      quantity: 1,
      unitPrice: 5,
    });
    expect(r.success).toBe(false);
  });

  it("creates ReservationConsumption + StockMovement when productId provided (dual-write)", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);
    const r = await createReservationConsumption({
      reservationId: RES_UUID,
      productId: PROD_UUID,
      description: "Refrigerante lata",
      quantity: 2,
      unitPrice: 8,
    });
    expect(r.success).toBe(true);
    expect(txMock.reservationConsumption.create).toHaveBeenCalledOnce();
    expect(applyMovement).toHaveBeenCalledWith(
      txMock,
      expect.objectContaining({
        productId: PROD_UUID,
        type: "RESERVATION_CONSUMPTION",
        reservationId: RES_UUID,
      }),
    );
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CONSUMPTION_LOG", entity: "ReservationConsumption" }),
    );
  });

  it("creates only ReservationConsumption (no stock change) when no productId", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);
    const r = await createReservationConsumption({
      reservationId: RES_UUID,
      description: "Cortesia da casa",
      quantity: 1,
      unitPrice: 0,
    });
    expect(r.success).toBe(true);
    expect(applyMovement).not.toHaveBeenCalled();
  });

  it("blocks consumption on CANCELLED reservation", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);
    prismaMock.reservation.findUnique.mockResolvedValue(TERMINAL_CANCELLED);
    const r = await createReservationConsumption({
      reservationId: RES_UUID,
      description: "Refri",
      quantity: 1,
      unitPrice: 5,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain("cancelada");
  });

  it("blocks consumption on closed reservation", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);
    prismaMock.reservation.findUnique.mockResolvedValue(CLOSED);
    const r = await createReservationConsumption({
      reservationId: RES_UUID,
      description: "Refri",
      quantity: 1,
      unitPrice: 5,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain("fechada");
  });

  it("calculates totalPrice = quantity × unitPrice", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);
    await createReservationConsumption({
      reservationId: RES_UUID,
      description: "Refri",
      quantity: 3,
      unitPrice: 4,
    });
    const createCall = txMock.reservationConsumption.create.mock.calls[0][0] as {
      data: { totalPrice: Prisma.Decimal };
    };
    expect(createCall.data.totalPrice.toString()).toBe("12");
  });
});

describe("listConsumptionsForReservation", () => {
  it("allows FINANCEIRO to view reservation consumption without create permission", async () => {
    getCurrentUser.mockResolvedValue(FINANCEIRO);
    prismaMock.reservationConsumption.findMany.mockResolvedValue([{ id: "cons-1" }]);

    const result = await listConsumptionsForReservation(RES_UUID);

    expect(result).toEqual([{ id: "cons-1" }]);
    expect(prismaMock.reservationConsumption.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { reservationId: RES_UUID } }),
    );
  });
});

describe("deleteReservationConsumption", () => {
  it("requires GERENCIA+ role (blocks SECRETARIA)", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    const r = await deleteReservationConsumption("cons-1");
    expect(r.success).toBe(false);
  });

  it("creates POSITIVE_ADJUSTMENT to restock when deleting with product", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    prismaMock.reservationConsumption.findUnique.mockResolvedValue({
      id: "cons-1",
      reservationId: RES_UUID,
      productId: PROD_UUID,
      quantity: new Prisma.Decimal("2"),
      reservation: ACTIVE_RES,
    });
    const r = await deleteReservationConsumption("cons-1");
    expect(r.success).toBe(true);
    expect(applyMovement).toHaveBeenCalledWith(
      txMock,
      expect.objectContaining({
        productId: PROD_UUID,
        type: "POSITIVE_ADJUSTMENT",
      }),
    );
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CONSUMPTION_REVERSE" }),
    );
  });

  it("blocks delete when reservation is closed", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    prismaMock.reservationConsumption.findUnique.mockResolvedValue({
      id: "cons-1",
      reservationId: RES_UUID,
      productId: PROD_UUID,
      quantity: new Prisma.Decimal("2"),
      reservation: ACTIVE_RES,
    });
    prismaMock.reservation.findUnique.mockResolvedValue(CLOSED);
    const r = await deleteReservationConsumption("cons-1");
    expect(r.success).toBe(false);
  });
});
