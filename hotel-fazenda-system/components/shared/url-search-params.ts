import type { PeriodPreset } from "@/lib/date-periods";

export function withPeriodParam(searchParams: URLSearchParams, preset: PeriodPreset) {
  const params = new URLSearchParams(searchParams.toString());
  params.set("periodo", preset);
  if (preset !== "custom") {
    params.delete("from");
    params.delete("to");
  }
  return params;
}

export function withDateParam(
  searchParams: URLSearchParams,
  key: "from" | "to",
  date: Date | null,
) {
  const params = new URLSearchParams(searchParams.toString());
  const value = date?.toISOString().split("T")[0];
  if (value) params.set(key, value);
  else params.delete(key);
  return params;
}

export function withOptionalParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | null,
) {
  const params = new URLSearchParams(searchParams.toString());
  if (value) params.set(key, value);
  else params.delete(key);
  return params;
}
