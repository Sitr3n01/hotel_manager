import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ActiveBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <Badge variant="default" className="border-success/20 bg-success/10 text-success">
        Ativo
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      Inativo
    </Badge>
  );
}

export function InlineTableError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
      role="alert"
    >
      {message}
    </p>
  );
}

export function EmptyMessage({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Inbox className="text-muted-foreground/50 h-10 w-10" />
      <p className="text-muted-foreground text-sm">{message}</p>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}
