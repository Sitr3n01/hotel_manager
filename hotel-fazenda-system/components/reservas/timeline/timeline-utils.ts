export const DAY_WIDTH_PX = 48;
export const ROW_HEIGHT_PX = 56;
export const SIDEBAR_WIDTH_PX = 180;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysBetween(start: Date, end: Date): number {
  const s = toDateOnly(start);
  const e = toDateOnly(end);
  return Math.round((e.getTime() - s.getTime()) / MS_PER_DAY);
}

export function addDays(date: Date, n: number): Date {
  const d = toDateOnly(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function dateToPixel(date: Date, rangeStart: Date): number {
  return daysBetween(rangeStart, date) * DAY_WIDTH_PX;
}

export function pixelToDate(px: number, rangeStart: Date): Date {
  const days = Math.round(px / DAY_WIDTH_PX);
  return addDays(rangeStart, days);
}

function toDateOnly(date: Date): Date {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}
