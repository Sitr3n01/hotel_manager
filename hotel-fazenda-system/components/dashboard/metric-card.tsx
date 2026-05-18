import type { ComponentType, SVGProps } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type MetricTone = "primary" | "success" | "warning" | "destructive" | "info" | "neutral";

const TONE_CLASSES: Record<MetricTone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-accent text-accent-foreground",
  neutral: "bg-muted text-muted-foreground",
};

export type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: MetricTone;
};

export function MetricCard({ title, value, description, icon: Icon, tone }: MetricCardProps) {
  return (
    <Card className="elevation-1 border-border/60 hover:elevation-2 transition-shadow">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              TONE_CLASSES[tone],
            )}
            aria-hidden
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-medium tracking-tight">{value}</p>
          <p className="text-foreground text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
