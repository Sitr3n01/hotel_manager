"use client";

import { DatePicker } from "@/components/shared/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPeriodLabel, getPeriodOptions, type PeriodPreset } from "@/lib/date-periods";

type Props = {
  currentPreset: PeriodPreset;
  currentFrom?: string;
  currentTo?: string;
  triggerClassName?: string;
  onPresetChange: (preset: PeriodPreset) => void;
  onFromChange: (date: Date | null) => void;
  onToChange: (date: Date | null) => void;
};

export function PeriodFilter({
  currentPreset,
  currentFrom,
  currentTo,
  triggerClassName = "w-[180px]",
  onPresetChange,
  onFromChange,
  onToChange,
}: Props) {
  return (
    <>
      <Select
        value={currentPreset}
        onValueChange={(value) => value && onPresetChange(value as PeriodPreset)}
      >
        <SelectTrigger className={triggerClassName} size="sm">
          <SelectValue>
            {(value: PeriodPreset | null) => (value ? getPeriodLabel(value) : "Período")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {getPeriodOptions().map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {currentPreset === "custom" ? (
        <div className="flex items-center gap-2">
          <DatePicker
            value={toLocalDate(currentFrom)}
            onChange={onFromChange}
            placeholder="Início"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <DatePicker value={toLocalDate(currentTo)} onChange={onToChange} placeholder="Fim" />
        </div>
      ) : null}
    </>
  );
}

function toLocalDate(value?: string): Date | undefined {
  return value ? new Date(`${value}T12:00:00`) : undefined;
}
