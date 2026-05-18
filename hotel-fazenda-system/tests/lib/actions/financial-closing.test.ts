import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { getCurrentUser, logAudit, revalidatePath, prismaMock } = vi.hoisted(() => {
  const mockFn = () => vi.fn();
  const makeDelegate = <const T extends readonly string[]>(keys: T) =>
    Object.fromEntries(keys.map((key) => [key, mockFn()])) as Record<
      T[number],
      ReturnType<typeof vi.fn>
    >;
  const prismaMock = {
    financialClosing: makeDelegate(["findMany", "findUnique", "upsert", "update"]),
    reservation: makeDelegate(["findMany", "findUnique", "update"]),
    room: makeDelegate(["update"]),
    $transaction: mockFn(),
  };

  return {
    getCurrentUser: mockFn(),
    logAudit: mockFn(),
    revalidatePath: mockFn(),
    prismaMock,
  };
});

vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser }));
vi.mock("@/lib/audit", () => ({ logAudit }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  finalizeClosing,
  reopenClosing,
  updatePaymentStatus,
  upsertFinancialClosing,
} from "@/lib/actions/financial-closing";

const ADMIN = {
  id: "user-admin",
  role: "ADMIN" as const,
  isActive: true,
  email: "admin@local",
  name: "Admin",
  authUserId: "auth-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const FINANCEIRO = { ...ADMIN, id: "user-fin", role: "FINANCEIRO" as const };
const SECRETARIA = { ...ADMIN, id: "user-sec", role: "SECRETARIA" as const };

const RESERVATION_ID = "550e8400-e29b-41d4-a716-446655440101";
const CLOSING_ID = "550e8400-e29b-41d4-a716-446655440202";
const ROOM_ID = "550e8400-e29b-41d4-a716-446655440303";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) =>
    fn(prismaMock),
  );
});

describe("upsertFinancialClosing", () => {
  it("calcula totais, persiste justificativas e registra audit log", async () => {
    getCurrentUser.mockResolvedValue(FINANCEIRO);
    prismaMock.reservation.findUnique.mockResolvedValue(makeReservation({ closing: null }));
    prismaMock.financialClosing.upsert.mockResolvedValue({ id: CLOSING_ID });

    const result = await upsertFinancialClosing({
      reservationId: RESERVATION_ID,
      discountTotal: 50,
      extraTotal: 40,
      discountJustification: "Promocional",
      extraJustification: "Lavanderia",
      paymentStatus: "PARTIAL",
      paymentMethod: "PIX",
    });

    expect(result.success).toBe(true);
    const call = prismaMock.financialClosing.upsert.mock.calls[0]?.[0];
    expect(call?.where).toEqual({ reservationId: RESERVATION_ID });
    expect(call?.create.reservationId).toBe(RESERVATION_ID);
    expect(call?.create.dailyTotal.equals(new Prisma.Decimal(600))).toBe(true);
    expect(call?.create.consumptionTotal.equals(new Prisma.Decimal(100))).toBe(true);
    expect(call?.create.finalTotal.equals(new Prisma.Decimal(690))).toBe(true);
    expect(call?.create.discountJustification).toBe("Promocional");
    expect(call?.create.extraJustification).toBe("Lavanderia");
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: FINANCEIRO.id,
        action: "CREATE",
        entity: "FinancialClosing",
        entityId: CLOSING_ID,
      }),
    );
  });

  it("bloqueia alteracao de fechamento finalizado", async () => {
    getCurrentUser.mockResolvedValue(FINANCEIRO);
    prismaMock.reservation.findUnique.mockResolvedValue(
      makeReservation({ closing: { closedAt: new Date("2026-05-20") } }),
    );

    const result = await upsertFinancialClosing(makeInput({ discountTotal: 0 }));

    expect(result.success).toBe(false);
    expect(prismaMock.financialClosing.upsert).not.toHaveBeenCalled();
  });

  it("exige justificativa para desconto acima de 20% das diarias", async () => {
    getCurrentUser.mockResolvedValue(FINANCEIRO);
    prismaMock.reservation.findUnique.mockResolvedValue(makeReservation({ closing: null }));

    const result = await upsertFinancialClosing(makeInput({ discountTotal: 150 }));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors?.discountJustification).toBeDefined();
    expect(prismaMock.financialClosing.upsert).not.toHaveBeenCalled();
  });
});

describe("finalizeClosing", () => {
  it("finaliza fechamento e faz checkout operacional quando reserva esta hospedada", async () => {
    getCurrentUser.mockResolvedValue(FINANCEIRO);
    prismaMock.financialClosing.findUnique.mockResolvedValue(makeOpenClosing("CHECKED_IN"));
    prismaMock.financialClosing.update.mockResolvedValue({
      id: CLOSING_ID,
      closedAt: new Date("2026-05-23T12:00:00"),
    });

    const result = await finalizeClosing(CLOSING_ID);

    expect(result.success).toBe(true);
    expect(prismaMock.reservation.update).toHaveBeenCalledWith({
      where: { id: RESERVATION_ID },
      data: { status: "CHECKED_OUT" },
    });
    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: ROOM_ID },
      data: { status: "CLEANING" },
    });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "CLOSE" }));
  });
});

describe("reopenClosing", () => {
  it("reabre fechamento com motivo sem alterar reserva ou quarto", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    prismaMock.financialClosing.findUnique.mockResolvedValue({
      id: CLOSING_ID,
      closedAt: new Date("2026-05-24T12:00:00"),
    });
    prismaMock.financialClosing.update.mockResolvedValue({ id: CLOSING_ID, closedAt: null });

    const result = await reopenClosing(CLOSING_ID, { reason: "Corrigir lancamento" });

    expect(result.success).toBe(true);
    expect(prismaMock.financialClosing.update).toHaveBeenCalledWith({
      where: { id: CLOSING_ID },
      data: { closedAt: null, closedById: null },
    });
    expect(prismaMock.reservation.update).not.toHaveBeenCalled();
    expect(prismaMock.room.update).not.toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "REOPEN",
        metadata: { reason: "Corrigir lancamento" },
      }),
    );
  });
});

describe("updatePaymentStatus", () => {
  it("atualiza status e metodo de pagamento com audit log", async () => {
    getCurrentUser.mockResolvedValue(FINANCEIRO);
    prismaMock.financialClosing.findUnique.mockResolvedValue({
      id: CLOSING_ID,
      paymentStatus: "PENDING",
      paymentMethod: null,
    });
    prismaMock.financialClosing.update.mockResolvedValue({ id: CLOSING_ID });

    const result = await updatePaymentStatus(CLOSING_ID, "PAID", "PIX");

    expect(result.success).toBe(true);
    expect(prismaMock.financialClosing.update).toHaveBeenCalledWith({
      where: { id: CLOSING_ID },
      data: { paymentStatus: "PAID", paymentMethod: "PIX" },
    });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PAYMENT_STATUS",
        afterData: { paymentStatus: "PAID", paymentMethod: "PIX" },
      }),
    );
  });

  it("bloqueia secretaria para alterar pagamento", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);

    const result = await updatePaymentStatus(CLOSING_ID, "PAID", "PIX");

    expect(result.success).toBe(false);
    expect(prismaMock.financialClosing.update).not.toHaveBeenCalled();
  });
});

function makeInput(overrides = {}) {
  return {
    reservationId: RESERVATION_ID,
    discountTotal: 0,
    extraTotal: 0,
    paymentStatus: "PENDING" as const,
    paymentMethod: null,
    ...overrides,
  };
}

function makeReservation({ closing }: { closing: { closedAt: Date } | null }) {
  return {
    id: RESERVATION_ID,
    checkInDate: new Date("2026-05-20T15:00:00"),
    checkOutDate: new Date("2026-05-23T11:00:00"),
    dailyRate: new Prisma.Decimal(200),
    discountAmount: new Prisma.Decimal(0),
    closing,
    guest: { name: "Maria" },
    room: { id: ROOM_ID, name: "Chale", number: "01" },
    consumptions: [
      {
        id: "consumption-1",
        description: "Jantar",
        quantity: new Prisma.Decimal(2),
        unitPrice: new Prisma.Decimal(50),
        totalPrice: new Prisma.Decimal(100),
        createdAt: new Date("2026-05-21T20:00:00"),
        product: { name: "Jantar" },
      },
    ],
  };
}

function makeOpenClosing(status: "CHECKED_IN" | "CHECKED_OUT") {
  return {
    id: CLOSING_ID,
    reservationId: RESERVATION_ID,
    closedAt: null,
    reservation: {
      id: RESERVATION_ID,
      status,
      roomId: ROOM_ID,
    },
  };
}
