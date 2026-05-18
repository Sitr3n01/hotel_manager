"use client";
import { useSync } from "@/lib/sync/provider";
import { cn } from "@/lib/utils";

export function PendingBadge({ className }: { className?: string }) {
  const { counts } = useSync();
  const total = counts.PENDING + counts.FAILED + counts.CONFLICT;
  if (total <= 0) return null;
  return (
    <span
      aria-label={`${total} operações pendentes`}
      className={cn(
        "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/20 px-1.5 text-[10px] font-semibold text-warning",
        className,
      )}
    >
      {total}
    </span>
  );
}
