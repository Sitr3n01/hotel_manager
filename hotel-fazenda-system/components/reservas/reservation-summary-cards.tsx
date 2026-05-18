import { CalendarCheck, CalendarX, LogIn, LogOut } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ReservationsSummary = {
  checkInsToday: number;
  checkOutsToday: number;
  occupiedNow: number;
  pendingConfirmation: number;
};

type Card = {
  label: string;
  value: number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: "primary" | "success" | "warning" | "neutral";
};

const TONE: Record<Card["tone"], string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  neutral: "bg-muted text-muted-foreground",
};

export function ReservationSummaryCards({ summary }: { summary: ReservationsSummary }) {
  const cards: Card[] = [
    { label: "Check-ins hoje", value: summary.checkInsToday, icon: LogIn, tone: "primary" },
    { label: "Check-outs hoje", value: summary.checkOutsToday, icon: LogOut, tone: "neutral" },
    { label: "Ocupados agora", value: summary.occupiedNow, icon: CalendarCheck, tone: "success" },
    {
      label: "A confirmar",
      value: summary.pendingConfirmation,
      icon: CalendarX,
      tone: "warning",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <SummaryCard card={card} key={card.label} />
      ))}
    </section>
  );
}

function SummaryCard({ card }: { card: Card }) {
  const Icon = card.icon;
  return (
    <Card className="elevation-1 border-border/60">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", TONE[card.tone])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <p className="text-2xl font-medium tracking-tight">{card.value}</p>
          <p className="text-muted-foreground text-xs">{card.label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
