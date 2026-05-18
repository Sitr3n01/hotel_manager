"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PeriodFilter } from "@/components/shared/period-filter";
import {
  withDateParam,
  withOptionalParam,
  withPeriodParam,
} from "@/components/shared/url-search-params";
import type { PeriodPreset } from "@/lib/date-periods";

type FilterOption = { value: string; label: string };

type ReportFiltersProps = {
  currentPreset: PeriodPreset;
  currentFrom?: string;
  currentTo?: string;
  showStatusFilter?: boolean;
  statusOptions?: FilterOption[];
  currentStatus?: string;
  statusParam?: string;
  showTypeFilter?: boolean;
  typeOptions?: FilterOption[];
  currentType?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  currentSearch?: string;
  searchParam?: string;
};

export function ReportFilters(props: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pushParams = (params: URLSearchParams) => router.push(`?${params.toString()}`);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <PeriodFilter
        currentPreset={props.currentPreset}
        currentFrom={props.currentFrom}
        currentTo={props.currentTo}
        triggerClassName="w-[170px]"
        onPresetChange={(preset) => pushParams(withPeriodParam(searchParams, preset))}
        onFromChange={(date) => pushParams(withDateParam(searchParams, "from", date))}
        onToChange={(date) => pushParams(withDateParam(searchParams, "to", date))}
      />
      <OptionalSelectFilter
        enabled={props.showStatusFilter}
        value={props.currentStatus}
        options={props.statusOptions}
        widthClass="w-[160px]"
        onChange={(value) =>
          pushParams(withOptionalParam(searchParams, props.statusParam ?? "status", value))
        }
      />
      <OptionalSelectFilter
        enabled={props.showTypeFilter}
        value={props.currentType}
        options={props.typeOptions}
        widthClass="w-[180px]"
        onChange={(value) => pushParams(withOptionalParam(searchParams, "tipo", value))}
      />
      {props.showSearch ? (
        <Input
          className="w-[200px]"
          defaultValue={props.currentSearch ?? ""}
          placeholder={props.searchPlaceholder ?? "Buscar..."}
          onChange={(event) =>
            pushParams(
              withOptionalParam(searchParams, props.searchParam ?? "busca", event.target.value),
            )
          }
        />
      ) : null}
    </div>
  );
}

function OptionalSelectFilter({
  enabled,
  value,
  options,
  widthClass,
  onChange,
}: {
  enabled?: boolean;
  value?: string;
  options?: FilterOption[];
  widthClass: string;
  onChange: (value: string | null) => void;
}) {
  if (!enabled || !options) return null;
  return (
    <Select value={value ?? "all"} onValueChange={(next) => onChange(next === "all" ? null : next)}>
      <SelectTrigger className={widthClass} size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os status</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
