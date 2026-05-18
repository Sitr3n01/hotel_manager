"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyMessage } from "@/components/shared/list-parts";
import { OnlineIndicator } from "@/components/sync/online-indicator";
import { PendingRow } from "@/components/sync/pending-row";
import { useSync } from "@/lib/sync/provider";
import { listAll } from "@/lib/sync/queue";
import { OPERATION_LABEL, formatTimestamp } from "@/lib/sync/format";
import type { PendingOperation } from "@/lib/sync/types";
import type { SyncHistoryItem } from "@/app/(protected)/sincronizacao/page";

type Props = { history: SyncHistoryItem[] };

export function SyncPageClient({ history }: Props) {
  const { connectivity, counts, triggerSync, refreshCounts } = useSync();
  const [items, setItems] = useState<PendingOperation[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listAll());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
    await refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    // IndexedDB has no native subscription API — we must read on mount and
    // store the snapshot. Justified case for set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => reload();
    window.addEventListener("sync:enqueued", handler);
    return () => window.removeEventListener("sync:enqueued", handler);
  }, [reload]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        connectivity={connectivity}
        onSync={async () => {
          await triggerSync();
          await reload();
        }}
      />
      <SummaryCards counts={counts} />
      <QueueCard items={items} loading={loading} onChange={reload} />

      <HistoryCard history={history} />
    </div>
  );
}

function PageHeader({
  connectivity,
  onSync,
}: {
  connectivity: ReturnType<typeof useSync>["connectivity"];
  onSync: () => Promise<void>;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Sincronização</h1>
        <p className="text-muted-foreground text-sm">
          Operações registradas offline aparecem aqui até serem enviadas ao servidor.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <OnlineIndicator />
        <Button
          size="sm"
          variant="outline"
          onClick={onSync}
          disabled={connectivity !== "online"}
        >
          <RefreshCw className="h-4 w-4" /> Sincronizar agora
        </Button>
      </div>
    </header>
  );
}

function QueueCard({
  items,
  loading,
  onChange,
}: {
  items: PendingOperation[];
  loading: boolean;
  onChange: () => Promise<void>;
}) {
  return (
    <Card className="elevation-1">
      <CardHeader>
        <CardTitle>Fila local</CardTitle>
        <CardDescription>
          Operações deste dispositivo. Itens concluídos ficam visíveis até descarte ou limpeza futura.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <EmptyMessage message="Carregando..." />
        ) : items.length === 0 ? (
          <EmptyMessage
            message="Nenhuma operação na fila local"
            hint="Lançamentos feitos offline aparecem aqui."
          />
        ) : (
          <QueueTable items={items} onChange={onChange} />
        )}
      </CardContent>
    </Card>
  );
}

function QueueTable({
  items,
  onChange,
}: {
  items: PendingOperation[];
  onChange: () => Promise<void>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Operação</TableHead>
          <TableHead>Quando</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Erro</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((op) => (
          <PendingRow key={op.localId} op={op} onChange={onChange} />
        ))}
      </TableBody>
    </Table>
  );
}

function SummaryCards({ counts }: { counts: ReturnType<typeof useSync>["counts"] }) {
  const cards = [
    { label: "Pendentes", value: counts.PENDING, tone: "warning" as const },
    { label: "Sincronizando", value: counts.SYNCING, tone: "accent" as const },
    { label: "Sincronizadas", value: counts.SYNCED, tone: "success" as const },
    { label: "Falhas", value: counts.FAILED, tone: "destructive" as const },
    { label: "Conflitos", value: counts.CONFLICT, tone: "destructive" as const },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label} className="elevation-1">
          <CardContent className="space-y-1 p-4">
            <p className="text-muted-foreground text-xs">{c.label}</p>
            <p className="text-2xl font-medium">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HistoryCard({ history }: { history: SyncHistoryItem[] }) {
  return (
    <Card className="elevation-1">
      <CardHeader>
        <CardTitle>Histórico no servidor</CardTitle>
        <CardDescription>
          Últimas 50 sincronizações deste usuário, incluindo conflitos e falhas registrados no banco.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <EmptyMessage message="Sem histórico ainda" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Quando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((row) => (
                <TableRow key={row.id}>
                  <TableCellSafe>{labelForType(row.operationType)}</TableCellSafe>
                  <TableCellSafe muted>{row.entity}</TableCellSafe>
                  <TableCellSafe>{row.result}</TableCellSafe>
                  <TableCellSafe muted>{row.errorMessage ?? "—"}</TableCellSafe>
                  <TableCellSafe muted>
                    {formatTimestamp(new Date(row.createdAt).getTime())}
                  </TableCellSafe>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TableCellSafe({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td
      className={`px-2 py-2 text-sm ${muted ? "text-muted-foreground" : ""}`}
    >
      {children}
    </td>
  );
}

function labelForType(type: string): string {
  return (OPERATION_LABEL as Record<string, string>)[type] ?? type;
}
