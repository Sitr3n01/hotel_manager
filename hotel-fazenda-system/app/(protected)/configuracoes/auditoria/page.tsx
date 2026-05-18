import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAuditLogsForAdmin } from "@/lib/queries/users";

export default async function AuditoriaPage() {
  const logs = await listAuditLogsForAdmin();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Últimas ações administrativas e operacionais registradas pelo sistema.
        </p>
      </header>

      <Card className="elevation-1 border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Ator</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDate(log.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{log.entity}</span>
                  </TableCell>
                  <TableCell>{log.actor?.name ?? "Sistema"}</TableCell>
                  <TableCell className="max-w-md whitespace-normal">
                    <code className="text-xs text-muted-foreground">{summarize(log.metadata)}</code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function summarize(value: unknown): string {
  if (!value) return "Sem detalhes";
  const text = JSON.stringify(value);
  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}
