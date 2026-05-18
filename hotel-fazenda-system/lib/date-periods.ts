import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";

export type PeriodPreset = "today" | "last7" | "currentMonth" | "lastMonth" | "custom";

export type DateRange = {
  start: Date;
  end: Date;
  label: string;
};

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "Hoje",
  last7: "Últimos 7 dias",
  currentMonth: "Mês atual",
  lastMonth: "Mês anterior",
  custom: "Personalizado",
};

export function getDateRange(
  preset: PeriodPreset,
  customStart?: Date,
  customEnd?: Date,
): DateRange {
  const now = new Date();

  switch (preset) {
    case "today":
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        label: PERIOD_LABELS.today,
      };
    case "last7":
      return {
        start: startOfDay(subDays(now, 6)),
        end: endOfDay(now),
        label: PERIOD_LABELS.last7,
      };
    case "currentMonth":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: PERIOD_LABELS.currentMonth,
      };
    case "lastMonth": {
      const lastMonthDate = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonthDate),
        end: endOfMonth(lastMonthDate),
        label: PERIOD_LABELS.lastMonth,
      };
    }
    case "custom":
      if (customStart && customEnd) {
        return {
          start: startOfDay(customStart),
          end: endOfDay(customEnd),
          label: PERIOD_LABELS.custom,
        };
      }
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: PERIOD_LABELS.currentMonth,
      };
  }
}

export function getPeriodLabel(preset: PeriodPreset): string {
  return PERIOD_LABELS[preset];
}

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "last7", label: "Últimos 7 dias" },
  { value: "currentMonth", label: "Mês atual" },
  { value: "lastMonth", label: "Mês anterior" },
  { value: "custom", label: "Personalizado" },
];

export function getPeriodOptions() {
  return PERIOD_OPTIONS;
}
