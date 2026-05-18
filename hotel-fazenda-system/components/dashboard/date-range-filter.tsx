"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PeriodFilter } from "@/components/shared/period-filter";
import { withDateParam, withPeriodParam } from "@/components/shared/url-search-params";
import type { PeriodPreset } from "@/lib/date-periods";

type DateRangeFilterProps = {
  currentPreset: PeriodPreset;
  currentFrom?: string;
  currentTo?: string;
};

export function DateRangeFilter({
  currentPreset,
  currentFrom,
  currentTo,
}: DateRangeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pushParams = useCallback((params: URLSearchParams) => {
    router.push(`?${params.toString()}`);
  }, [router]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <PeriodFilter
        currentPreset={currentPreset}
        currentFrom={currentFrom}
        currentTo={currentTo}
        onPresetChange={(preset) => pushParams(withPeriodParam(searchParams, preset))}
        onFromChange={(date) => pushParams(withDateParam(searchParams, "from", date))}
        onToChange={(date) => pushParams(withDateParam(searchParams, "to", date))}
      />
    </div>
  );
}
