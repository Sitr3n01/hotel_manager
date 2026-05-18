"use client";

import { useMemo, useState } from "react";
import { addDays } from "@/components/reservas/timeline/timeline-utils";

type TimelineRange = {
  start: Date;
  end: Date;
  days: number;
  goBack: () => void;
  goForward: () => void;
  goToday: () => void;
  setDaysVisible: (n: number) => void;
};

const DEFAULT_DAYS = 30;
const STEP_DAYS = 7;

export function useTimelineRange(): TimelineRange {
  const [today] = useState(() => startOfToday());
  const [offset, setOffset] = useState(0);
  const [daysVisible, setDaysVisible] = useState(DEFAULT_DAYS);

  const start = useMemo(() => addDays(today, offset), [today, offset]);
  const end = useMemo(() => addDays(start, daysVisible - 1), [start, daysVisible]);

  return {
    start,
    end,
    days: daysVisible,
    goBack: () => setOffset((o) => o - STEP_DAYS),
    goForward: () => setOffset((o) => o + STEP_DAYS),
    goToday: () => setOffset(0),
    setDaysVisible,
  };
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
