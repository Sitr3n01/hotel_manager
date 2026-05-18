import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  title: string;
  sprint: number;
  description: string;
};

export function ModulePlaceholder({ title, sprint, description }: Props) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      <Card className="elevation-1 border-border/60">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/15 text-warning"
            aria-hidden
          >
            <Wrench className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-lg font-medium">Módulo em construção</h2>
              <Badge variant="outline" className="font-normal">
                Sprint {sprint}
              </Badge>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Esta área será implementada na <strong className="font-medium">Sprint {sprint}</strong>. Por
              enquanto, apenas a navegação e o layout estão disponíveis.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Detalhes do escopo em{" "}
            <code className="font-mono text-[11px]">
              planejamento_hotel_fazenda_sprints_e_prompt_sprint_1.md
            </code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
