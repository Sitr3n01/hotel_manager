import { describe, expect, it } from "vitest";
import {
  daysBetween,
  addDays,
  dateToPixel,
  pixelToDate,
  DAY_WIDTH_PX,
} from "@/components/reservas/timeline/timeline-utils";

function localDate(y: number, m: number, d: number): Date {
  return new Date(y, m, d);
}

describe("daysBetween", () => {
  it("calcula 3 dias entre datas", () => {
    expect(daysBetween(localDate(2026, 4, 17), localDate(2026, 4, 20))).toBe(3);
  });

  it("retorna 0 para mesma data", () => {
    const d = localDate(2026, 4, 17);
    expect(daysBetween(d, d)).toBe(0);
  });

  it("ignora horários", () => {
    const start = new Date(2026, 4, 17, 15, 0, 0);
    const end = new Date(2026, 4, 20, 9, 0, 0);
    expect(daysBetween(start, end)).toBe(3);
  });
});

describe("addDays", () => {
  it("adiciona 3 dias", () => {
    const d = localDate(2026, 4, 17);
    const result = addDays(d, 3);
    expect(result.getDate()).toBe(20);
    expect(result.getMonth()).toBe(4);
  });

  it("atravessa mês", () => {
    const d = localDate(2026, 4, 31);
    const result = addDays(d, 1);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(5);
  });
});

describe("dateToPixel", () => {
  it("converte data para pixel position", () => {
    const rangeStart = localDate(2026, 4, 1);
    const date = localDate(2026, 4, 5);
    expect(dateToPixel(date, rangeStart)).toBe(4 * DAY_WIDTH_PX);
  });
});

describe("pixelToDate", () => {
  it("converte pixel para data", () => {
    const rangeStart = localDate(2026, 4, 1);
    const result = pixelToDate(4 * DAY_WIDTH_PX, rangeStart);
    expect(result.getDate()).toBe(5);
    expect(result.getMonth()).toBe(4);
  });
});
