import { describe, expect, it, vi, beforeEach } from "vitest";

const { getCurrentUser, logAudit, revalidatePath, findOverlappingReservation, prismaMock } =
  vi.hoisted(() => ({
    getCurrentUser: vi.fn(),
    logAudit: vi.fn(),
    revalidatePath: vi.fn(),
    findOverlappingReservation: vi.fn(),
    prismaMock: {
      reservation: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      room: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  }));

vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser }));
vi.mock("@/lib/audit", () => ({ logAudit }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/availability", () => ({ findOverlappingReservation, listAvailableRooms: vi.fn() }));

import {
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  confirmReservation,
  createReservation,
  markNoShow,
  updateReservation,
} from "@/lib/actions/reservation";

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
const SECRETARIA = { ...ADMIN, id: "user-sec", role: "SECRETARIA" as const };
const COZINHA = { ...ADMIN, id: "user-coz", role: "COZINHA" as const };

const VALID_GUEST_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_ROOM_ID = "550e8400-e29b-41d4-a716-446655440001";
const RESERVATION_ID = "550e8400-e29b-41d4-a716-446655440099";

const validInput = {
  guestId: VALID_GUEST_ID,
  roomId: VALID_ROOM_ID,
  checkInDate: new Date("2026-05-20"),
  checkOutDate: new Date("2026-05-23"),
  adults: 2,
  children: 0,
  dailyRate: 280,
  discountAmount: 0,
};

const mockRoom = {
  id: VALID_ROOM_ID,
  isActive: true,
  status: "AVAILABLE",
  roomType: { maxCapacity: 4 },
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock));
});

describe("createReservation", () => {
  it("bloqueia COZINHA por falta de permissão", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);

    const result = await createReservation(validInput);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Sem permissão");
  });

  it("rejeita criação com capacidade excedida", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    prismaMock.room.findUnique.mockResolvedValue(mockRoom);
    findOverlappingReservation.mockResolvedValue(null);

    const result = await createReservation({ ...validInput, adults: 5, children: 0 });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Capacidade excedida");
  });

  it("rejeita criação em quarto inativo", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    prismaMock.room.findUnique.mockResolvedValue({ ...mockRoom, isActive: false });

    const result = await createReservation(validInput);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("inativo");
  });

  it("rejeita criação com overlap detectado", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    prismaMock.room.findUnique.mockResolvedValue(mockRoom);
    findOverlappingReservation.mockResolvedValue({ id: "other-reservation" });

    const result = await createReservation(validInput);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("já reservado");
  });

  it("cria reserva válida e dispara audit CREATE", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    prismaMock.room.findUnique.mockResolvedValue(mockRoom);
    findOverlappingReservation.mockResolvedValue(null);
    const created = { id: RESERVATION_ID, ...validInput };
    prismaMock.reservation.create.mockResolvedValue(created);

    const result = await createReservation(validInput);

    expect(result.success).toBe(true);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: SECRETARIA.id,
        action: "CREATE",
        entity: "Reservation",
        entityId: RESERVATION_ID,
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/reservas");
  });
});

describe("status transitions", () => {
  it("confirmReservation rejeita se status atual não é PRE_RESERVED", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CHECKED_IN",
      roomId: VALID_ROOM_ID,
      checkInDate: new Date(),
    });

    const result = await confirmReservation(RESERVATION_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Transição");
  });

  it("confirmReservation bloqueia quarto indisponível", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      status: "PRE_RESERVED",
      roomId: VALID_ROOM_ID,
      checkInDate: new Date(),
    });
    prismaMock.room.findUnique.mockResolvedValue({ ...mockRoom, status: "BLOCKED" });
    prismaMock.reservation.update.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CONFIRMED",
    });

    const result = await confirmReservation(RESERVATION_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("disponível");
  });

  it("checkInReservation transiciona status e seta room.status=OCCUPIED", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CONFIRMED",
      roomId: VALID_ROOM_ID,
      checkInDate: new Date(),
    });
    prismaMock.room.findUnique.mockResolvedValue({ ...mockRoom, status: "RESERVED" });
    prismaMock.reservation.update.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CHECKED_IN",
    });

    const result = await checkInReservation(RESERVATION_ID);

    expect(result.success).toBe(true);
    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: VALID_ROOM_ID },
      data: { status: "OCCUPIED" },
    });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHECK_IN", entity: "Reservation" }),
    );
  });

  it("checkInReservation bloqueia quarto em manutenção", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CONFIRMED",
      roomId: VALID_ROOM_ID,
      checkInDate: new Date(),
    });
    prismaMock.room.findUnique.mockResolvedValue({ ...mockRoom, status: "MAINTENANCE" });
    prismaMock.reservation.update.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CHECKED_IN",
    });

    const result = await checkInReservation(RESERVATION_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("indisponível");
  });

  it("checkOutReservation seta room.status=CLEANING", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CHECKED_IN",
      roomId: VALID_ROOM_ID,
      checkInDate: new Date(),
    });
    prismaMock.reservation.update.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CHECKED_OUT",
    });

    const result = await checkOutReservation(RESERVATION_ID);

    expect(result.success).toBe(true);
    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: VALID_ROOM_ID },
      data: { status: "CLEANING" },
    });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHECK_OUT" }),
    );
  });

  it.each([
    ["SECRETARIA", SECRETARIA],
    ["ADMIN", ADMIN],
  ])("cancelReservation permite %s e registra reason em metadata", async (_label, user) => {
    getCurrentUser.mockResolvedValue(user);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CONFIRMED",
      roomId: VALID_ROOM_ID,
      checkInDate: new Date(),
    });
    prismaMock.room.findUnique.mockResolvedValue({ ...mockRoom, status: "RESERVED" });
    prismaMock.reservation.update.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CANCELLED",
    });

    const result = await cancelReservation(RESERVATION_ID, "Hóspede desistiu");

    expect(result.success).toBe(true);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CANCEL",
        metadata: expect.objectContaining({ reason: "Hóspede desistiu" }),
      }),
    );
  });

  it("markNoShow rejeita antes da data de check-in", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CONFIRMED",
      roomId: VALID_ROOM_ID,
      checkInDate: futureDate,
    });

    const result = await markNoShow(RESERVATION_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("a partir da data");
  });
});

describe("updateReservation", () => {
  it("bloqueia edição de reserva finalizada", async () => {
    getCurrentUser.mockResolvedValue(SECRETARIA);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CHECKED_OUT",
      roomId: VALID_ROOM_ID,
      checkInDate: new Date(),
      checkOutDate: new Date(),
      adults: 2,
      children: 0,
    });

    const result = await updateReservation(RESERVATION_ID, { notes: "tentando editar" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("finalizada");
  });
});
