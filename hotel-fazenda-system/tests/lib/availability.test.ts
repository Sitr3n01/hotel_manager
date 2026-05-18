import { describe, expect, it, vi, beforeEach } from "vitest";

const { findFirst, findMany } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reservation: { findFirst },
    room: { findMany },
  },
}));

import { findOverlappingReservation, listAvailableRooms } from "@/lib/availability";

beforeEach(() => {
  findFirst.mockReset();
  findMany.mockReset();
});

describe("findOverlappingReservation", () => {
  it("monta o where com filtro de overlap correto", async () => {
    findFirst.mockResolvedValue(null);
    const checkIn = new Date("2026-05-20T00:00:00");
    const checkOut = new Date("2026-05-23T00:00:00");

    await findOverlappingReservation({
      roomId: "room-1",
      checkInDate: checkIn,
      checkOutDate: checkOut,
    });

    expect(findFirst).toHaveBeenCalledTimes(1);
    const call = findFirst.mock.calls[0][0];
    expect(call.where.roomId).toBe("room-1");
    expect(call.where.status.in).toEqual(["PRE_RESERVED", "CONFIRMED", "CHECKED_IN"]);
    expect(call.where.checkInDate).toEqual({ lt: checkOut });
    expect(call.where.checkOutDate).toEqual({ gt: checkIn });
  });

  it("exclui reserva específica quando excludeReservationId é passado", async () => {
    findFirst.mockResolvedValue(null);

    await findOverlappingReservation({
      roomId: "room-1",
      checkInDate: new Date("2026-05-20"),
      checkOutDate: new Date("2026-05-23"),
      excludeReservationId: "reservation-99",
    });

    const call = findFirst.mock.calls[0][0];
    expect(call.where.NOT).toEqual({ id: "reservation-99" });
  });

  it("retorna a reserva conflitante quando existe", async () => {
    const mockReservation = { id: "r1", roomId: "room-1" };
    findFirst.mockResolvedValue(mockReservation);

    const result = await findOverlappingReservation({
      roomId: "room-1",
      checkInDate: new Date("2026-05-20"),
      checkOutDate: new Date("2026-05-23"),
    });

    expect(result).toBe(mockReservation);
  });

  it("retorna null quando não há overlap", async () => {
    findFirst.mockResolvedValue(null);

    const result = await findOverlappingReservation({
      roomId: "room-1",
      checkInDate: new Date("2026-05-20"),
      checkOutDate: new Date("2026-05-23"),
    });

    expect(result).toBeNull();
  });
});

describe("listAvailableRooms", () => {
  it("filtra quartos ativos sem reservas ocupando o período", async () => {
    findMany.mockResolvedValue([]);
    const checkIn = new Date("2026-05-20");
    const checkOut = new Date("2026-05-23");

    await listAvailableRooms({ checkInDate: checkIn, checkOutDate: checkOut });

    const call = findMany.mock.calls[0][0];
    expect(call.where.isActive).toBe(true);
    expect(call.where.reservations.none.status.in).toEqual([
      "PRE_RESERVED",
      "CONFIRMED",
      "CHECKED_IN",
    ]);
    expect(call.where.reservations.none.checkInDate).toEqual({ lt: checkOut });
    expect(call.where.reservations.none.checkOutDate).toEqual({ gt: checkIn });
    expect(call.include).toEqual({ roomType: true });
  });

  it("filtra por roomTypeId quando informado", async () => {
    findMany.mockResolvedValue([]);

    await listAvailableRooms({
      checkInDate: new Date("2026-05-20"),
      checkOutDate: new Date("2026-05-23"),
      roomTypeId: "type-1",
    });

    const call = findMany.mock.calls[0][0];
    expect(call.where.roomTypeId).toBe("type-1");
  });
});
