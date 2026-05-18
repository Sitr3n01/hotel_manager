import { describe, expect, it } from "vitest";
import {
  createReservationSchema,
  updateReservationSchema,
} from "@/lib/validations/reservation";

const VALID_GUEST_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_ROOM_ID = "550e8400-e29b-41d4-a716-446655440001";

const baseInput = {
  guestId: VALID_GUEST_ID,
  roomId: VALID_ROOM_ID,
  checkInDate: new Date("2026-05-20"),
  checkOutDate: new Date("2026-05-23"),
  adults: 2,
  children: 0,
  dailyRate: 280,
};

describe("createReservationSchema", () => {
  it("aceita dados válidos", () => {
    const result = createReservationSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it("rejeita check-out antes do check-in", () => {
    const result = createReservationSchema.safeParse({
      ...baseInput,
      checkInDate: new Date("2026-05-23"),
      checkOutDate: new Date("2026-05-20"),
    });
    expect(result.success).toBe(false);
  });

  it("rejeita check-out igual ao check-in (mesma data)", () => {
    const result = createReservationSchema.safeParse({
      ...baseInput,
      checkInDate: new Date("2026-05-20"),
      checkOutDate: new Date("2026-05-20"),
    });
    expect(result.success).toBe(false);
  });

  it("rejeita 0 adultos", () => {
    const result = createReservationSchema.safeParse({ ...baseInput, adults: 0 });
    expect(result.success).toBe(false);
  });

  it("rejeita crianças negativas", () => {
    const result = createReservationSchema.safeParse({ ...baseInput, children: -1 });
    expect(result.success).toBe(false);
  });

  it("rejeita diária negativa", () => {
    const result = createReservationSchema.safeParse({ ...baseInput, dailyRate: -10 });
    expect(result.success).toBe(false);
  });

  it("rejeita desconto negativo", () => {
    const result = createReservationSchema.safeParse({ ...baseInput, discountAmount: -5 });
    expect(result.success).toBe(false);
  });

  it("rejeita UUID inválido para guestId", () => {
    const result = createReservationSchema.safeParse({ ...baseInput, guestId: "invalid" });
    expect(result.success).toBe(false);
  });

  it("aplica default 0 para children", () => {
    const { children, ...withoutChildren } = baseInput;
    void children;
    const result = createReservationSchema.safeParse(withoutChildren);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.children).toBe(0);
  });

  it("aplica default 0 para discountAmount", () => {
    const result = createReservationSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.discountAmount).toBe(0);
  });

  it("mantém Date no resultado parseado", () => {
    const result = createReservationSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.checkInDate).toBeInstanceOf(Date);
      expect(result.data.checkOutDate).toBeInstanceOf(Date);
    }
  });
});

describe("updateReservationSchema", () => {
  it("aceita objeto vazio (atualização parcial)", () => {
    const result = updateReservationSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("aceita apenas mudança de notes", () => {
    const result = updateReservationSchema.safeParse({ notes: "Hóspede com pet" });
    expect(result.success).toBe(true);
  });

  it("valida coerência de datas quando ambas são informadas", () => {
    const result = updateReservationSchema.safeParse({
      checkInDate: new Date("2026-05-25"),
      checkOutDate: new Date("2026-05-20"),
    });
    expect(result.success).toBe(false);
  });

  it("aceita apenas check-in sem check-out", () => {
    const result = updateReservationSchema.safeParse({ checkInDate: new Date("2026-05-20") });
    expect(result.success).toBe(true);
  });
});
