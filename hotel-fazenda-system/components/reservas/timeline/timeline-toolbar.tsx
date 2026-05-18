"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date-format";

type Props = {
  start: Date;
  end: Date;
  days: number;
  onBack: () => void;
  onForward: () => void;
  onToday: () => void;
  onDaysChange: (days: number) => void;
};

const DAY_OPTIONS = [7, 14, 21, 30, 60];

export function TimelineToolbar({
  start,
  end,
  days,
  onBack,
  onForward,
  onToday,
  onDaysChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button size="icon-sm" variant="outline" onClick={onBack} title="Semana anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onToday} title="Ir para hoje">
          Hoje
        </Button>
        <Button size="icon-sm" variant="outline" onClick={onForward} title="Próxima semana">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-muted-foreground ml-2 text-sm">
          {formatDate(start)} – {formatDate(end)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium">Período</span>
        <div className="bg-muted flex items-center gap-0.5 rounded-lg p-0.5">
          {DAY_OPTIONS.map((n) => (
            <Button
              key={n}
              size="sm"
              variant={n === days ? "default" : "ghost"}
              onClick={() => onDaysChange(n)}
              className="h-7 min-w-14 px-2 text-xs"
            >
              {n} dias
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
