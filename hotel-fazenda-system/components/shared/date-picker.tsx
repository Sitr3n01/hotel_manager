"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

type Props = {
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  fromDate?: Date;
  toDate?: Date;
  className?: string;
  ariaInvalid?: boolean;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione a data",
  disabled,
  fromDate,
  toDate,
  className,
  ariaInvalid,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = value ?? undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? formatDate(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ?? null);
            if (date) setOpen(false);
          }}
          locale={ptBR}
          disabled={buildDisabledMatcher(fromDate, toDate)}
        />
      </PopoverContent>
    </Popover>
  );
}

function buildDisabledMatcher(fromDate?: Date, toDate?: Date) {
  if (!fromDate && !toDate) return undefined;
  return (date: Date) => {
    if (fromDate && date < fromDate) return true;
    if (toDate && date > toDate) return true;
    return false;
  };
}
