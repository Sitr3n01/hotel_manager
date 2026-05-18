import { BedDouble, CheckCircle2, Hammer, ShieldBan, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RoomSummary = {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  blocked: number;
};

type Props = { summary: RoomSummary };

type Tone = "primary" | "success" | "warning" | "destructive" | "neutral";

const TONES: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

const CARDS: Array<{ key: keyof RoomSummary; label: string; icon: typeof BedDouble; tone: Tone }> =
  [
    { key: "total", label: "Total de quartos", icon: BedDouble, tone: "primary" },
    { key: "available", label: "Disponíveis", icon: CheckCircle2, tone: "success" },
    { key: "occupied", label: "Ocupados", icon: Users, tone: "warning" },
    { key: "maintenance", label: "Manutenção / Limpeza", icon: Hammer, tone: "destructive" },
    { key: "blocked", label: "Bloqueados", icon: ShieldBan, tone: "neutral" },
  ];

export function RoomSummaryCards({ summary }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Resumo dos quartos">
      {CARDS.map(({ key, label, icon: Icon, tone }) => (
        <Card key={key} className="elevation-1 border-border/60">
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                TONES[tone],
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-medium tracking-tight">{summary[key]}</p>
              <p className="text-muted-foreground text-xs">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
