import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

const DATE_FORMAT = "dd/MM/yyyy";
const ISO_DATE_FORMAT = "yyyy-MM-dd";

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  return isValid(value) ? format(value, DATE_FORMAT, { locale: ptBR }) : "";
}

export function formatDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): string {
  const startStr = formatDate(start);
  const endStr = formatDate(end);
  if (!startStr && !endStr) return "";
  if (!endStr) return startStr;
  if (!startStr) return endStr;
  return `${startStr} – ${endStr}`;
}

export function formatIsoDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  return isValid(value) ? format(value, ISO_DATE_FORMAT) : "";
}

export function parseIsoDate(input: string): Date | null {
  if (!input) return null;
  const parsed = parse(input, ISO_DATE_FORMAT, new Date());
  return isValid(parsed) ? parsed : null;
}

export function toDateOnly(date: Date): Date {
  const copy = new Date(date.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
}
