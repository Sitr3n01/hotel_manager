"use client";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSync } from "@/lib/sync/provider";

export function OnlineIndicator() {
  const { connectivity, counts } = useSync();
  const pending = counts.PENDING + counts.FAILED + counts.CONFLICT;

  if (connectivity === "checking") {
    return (
      <Badge variant="secondary" className="font-normal">
        <Loader2 className="h-3 w-3 animate-spin" /> Conectando
      </Badge>
    );
  }

  if (connectivity === "online") {
    return (
      <Badge className="border-success/20 bg-success/10 text-success font-normal">
        <Wifi className="h-3 w-3" /> Online
        {pending > 0 ? ` · ${pending} pendente${pending > 1 ? "s" : ""}` : ""}
      </Badge>
    );
  }

  return (
    <Badge className="border-warning/20 bg-warning/10 text-warning font-normal">
      <WifiOff className="h-3 w-3" /> Offline
      {pending > 0 ? ` · ${pending} na fila` : ""}
    </Badge>
  );
}
