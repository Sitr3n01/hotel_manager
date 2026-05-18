import { describe, it, expect } from "vitest";
import { getDateRange, getPeriodLabel, getPeriodOptions } from "@/lib/date-periods";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";

describe("getDateRange", () => {
  it('returns today range for "today" preset', () => {
    const now = new Date();
    const range = getDateRange("today");
    expect(range.start).toEqual(startOfDay(now));
    expect(range.end).toEqual(endOfDay(now));
    expect(range.label).toBe("Hoje");
  });

  it('returns last 7 days range for "last7" preset', () => {
    const now = new Date();
    const range = getDateRange("last7");
    expect(range.start).toEqual(startOfDay(subDays(now, 6)));
    expect(range.end).toEqual(endOfDay(now));
    expect(range.label).toBe("Últimos 7 dias");
  });

  it('returns current month range for "currentMonth" preset', () => {
    const now = new Date();
    const range = getDateRange("currentMonth");
    expect(range.start).toEqual(startOfMonth(now));
    expect(range.end).toEqual(endOfMonth(now));
    expect(range.label).toBe("Mês atual");
  });

  it('returns last month range for "lastMonth" preset', () => {
    const now = new Date();
    const lastMonthDate = subMonths(now, 1);
    const range = getDateRange("lastMonth");
    expect(range.start).toEqual(startOfMonth(lastMonthDate));
    expect(range.end).toEqual(endOfMonth(lastMonthDate));
    expect(range.label).toBe("Mês anterior");
  });

  it("returns custom range when start and end provided", () => {
    const start = new Date(2026, 4, 10);
    const end = new Date(2026, 4, 20);
    const range = getDateRange("custom", start, end);
    expect(range.start).toEqual(startOfDay(start));
    expect(range.end).toEqual(endOfDay(end));
    expect(range.label).toBe("Personalizado");
  });

  it("falls back to current month when custom without dates", () => {
    const now = new Date();
    const range = getDateRange("custom");
    expect(range.start).toEqual(startOfMonth(now));
    expect(range.end).toEqual(endOfMonth(now));
  });
});

describe("getPeriodLabel", () => {
  it("returns correct label for each preset", () => {
    expect(getPeriodLabel("today")).toBe("Hoje");
    expect(getPeriodLabel("last7")).toBe("Últimos 7 dias");
    expect(getPeriodLabel("currentMonth")).toBe("Mês atual");
    expect(getPeriodLabel("lastMonth")).toBe("Mês anterior");
    expect(getPeriodLabel("custom")).toBe("Personalizado");
  });
});

describe("getPeriodOptions", () => {
  it("returns all 5 period options", () => {
    const options = getPeriodOptions();
    expect(options).toHaveLength(5);
    expect(options[0]).toEqual({ value: "today", label: "Hoje" });
    expect(options[4]).toEqual({ value: "custom", label: "Personalizado" });
  });
});
