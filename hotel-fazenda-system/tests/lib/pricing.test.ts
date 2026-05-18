import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { calculateNights, calculateReservationTotal } from "@/lib/pricing";

describe("calculateNights", () => {
  it("calcula 1 noite quando saída é dia seguinte", () => {
    const checkIn = new Date("2026-05-20T00:00:00");
    const checkOut = new Date("2026-05-21T00:00:00");
    expect(calculateNights(checkIn, checkOut)).toBe(1);
  });

  it("calcula 3 noites para estadia padrão de fim de semana", () => {
    const checkIn = new Date("2026-05-22T00:00:00");
    const checkOut = new Date("2026-05-25T00:00:00");
    expect(calculateNights(checkIn, checkOut)).toBe(3);
  });

  it("retorna 0 quando datas são iguais", () => {
    const date = new Date("2026-05-20T00:00:00");
    expect(calculateNights(date, date)).toBe(0);
  });

  it("retorna 0 (não negativo) quando check-out é anterior ao check-in", () => {
    const checkIn = new Date("2026-05-25T00:00:00");
    const checkOut = new Date("2026-05-22T00:00:00");
    expect(calculateNights(checkIn, checkOut)).toBe(0);
  });

  it("ignora horários ao calcular noites", () => {
    const checkIn = new Date("2026-05-20T15:00:00");
    const checkOut = new Date("2026-05-22T11:00:00");
    expect(calculateNights(checkIn, checkOut)).toBe(2);
  });

  it("atravessa mudança de mês corretamente", () => {
    const checkIn = new Date("2026-05-30T00:00:00");
    const checkOut = new Date("2026-06-02T00:00:00");
    expect(calculateNights(checkIn, checkOut)).toBe(3);
  });
});

describe("calculateReservationTotal", () => {
  it("multiplica noites por diária", () => {
    const total = calculateReservationTotal({ nights: 3, dailyRate: 280 });
    expect(total.toString()).toBe("840");
  });

  it("aplica desconto", () => {
    const total = calculateReservationTotal({
      nights: 3,
      dailyRate: 280,
      discountAmount: 100,
    });
    expect(total.toString()).toBe("740");
  });

  it("retorna 0 quando noites é 0", () => {
    const total = calculateReservationTotal({ nights: 0, dailyRate: 280 });
    expect(total.toString()).toBe("0");
  });

  it("nunca retorna negativo (clampa em 0 quando desconto > subtotal)", () => {
    const total = calculateReservationTotal({
      nights: 1,
      dailyRate: 100,
      discountAmount: 500,
    });
    expect(total.toString()).toBe("0");
  });

  it("aceita Prisma.Decimal como entrada", () => {
    const total = calculateReservationTotal({
      nights: 2,
      dailyRate: new Prisma.Decimal("150.50"),
      discountAmount: new Prisma.Decimal("0"),
    });
    expect(total.toString()).toBe("301");
  });

  it("aceita string como entrada", () => {
    const total = calculateReservationTotal({
      nights: 4,
      dailyRate: "199.99",
    });
    expect(total.toString()).toBe("799.96");
  });

  it("trata discountAmount null como zero", () => {
    const total = calculateReservationTotal({
      nights: 2,
      dailyRate: 100,
      discountAmount: null,
    });
    expect(total.toString()).toBe("200");
  });

  it("lança erro para noites negativas", () => {
    expect(() => calculateReservationTotal({ nights: -1, dailyRate: 100 })).toThrow(
      "Número de noites não pode ser negativo",
    );
  });
});
