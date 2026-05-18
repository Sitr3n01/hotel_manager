"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyMessage, InlineTableError } from "@/components/shared/list-parts";
import { GuestFormDialog } from "@/components/hospedes/guest-form-dialog";
import { deleteGuest } from "@/lib/actions/guest";
import { canManageGuests } from "@/lib/permissions";
import type { Guest, Role } from "@prisma/client";

type GuestWithCount = Guest & { _count: { reservations: number } };

type Props = {
  userRole: Role;
  guests: GuestWithCount[];
};

export function HospedesPageClient({ userRole, guests }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const canManage = canManageGuests(userRole);
  const filteredGuests = useMemo(() => filterGuests(guests, search), [guests, search]);

  async function handleDelete(guest: GuestWithCount) {
    if (!window.confirm(`Excluir o hóspede ${guest.name}? Esta ação é irreversível.`)) return;

    setActingId(guest.id);
    setTableError(null);
    const result = await deleteGuest(guest.id);
    setActingId(null);

    if (!result.success) {
      setTableError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Hóspedes</h1>
        <p className="text-muted-foreground text-sm">Cadastro e histórico de hóspedes do hotel.</p>
      </header>

      <GuestsToolbar
        canManage={canManage}
        search={search}
        setSearch={setSearch}
        onDone={() => router.refresh()}
      />

      <InlineTableError message={tableError} />

      {guests.length === 0 ? (
        <EmptyGuestsState canManage={canManage} />
      ) : (
        <GuestsTable
          actingId={actingId}
          canManage={canManage}
          guests={filteredGuests}
          onDelete={handleDelete}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  );
}

function GuestsToolbar({
  canManage,
  search,
  setSearch,
  onDone,
}: {
  canManage: boolean;
  search: string;
  setSearch: (value: string) => void;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar por nome, documento, telefone ou email..."
          className="h-9 w-72 pl-8 text-sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {canManage ? <GuestFormDialog mode="create" onDone={onDone} /> : null}
    </div>
  );
}

function GuestsTable({
  actingId,
  canManage,
  guests,
  onDelete,
  onDone,
}: {
  actingId: string | null;
  canManage: boolean;
  guests: GuestWithCount[];
  onDelete: (guest: GuestWithCount) => void;
  onDone: () => void;
}) {
  if (guests.length === 0) return <EmptyMessage message="Nenhum hóspede com este filtro." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Reservas</TableHead>
          {canManage ? <TableHead className="w-1" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {guests.map((guest) => (
          <GuestRow
            actingId={actingId}
            canManage={canManage}
            guest={guest}
            key={guest.id}
            onDelete={onDelete}
            onDone={onDone}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function GuestRow({
  actingId,
  canManage,
  guest,
  onDelete,
  onDone,
}: {
  actingId: string | null;
  canManage: boolean;
  guest: GuestWithCount;
  onDelete: (guest: GuestWithCount) => void;
  onDone: () => void;
}) {
  const reservationCount = guest._count.reservations;

  return (
    <TableRow>
      <TableCell className="font-medium">
        {guest.name}
        {guest.notes ? (
          <p className="text-muted-foreground max-w-64 truncate text-xs">{guest.notes}</p>
        ) : null}
      </TableCell>
      <TableCell>{guest.document ?? "—"}</TableCell>
      <TableCell>{guest.phone ?? "—"}</TableCell>
      <TableCell>{guest.email ?? "—"}</TableCell>
      <TableCell>
        <Badge variant="outline">{reservationCount}</Badge>
      </TableCell>
      {canManage ? (
        <TableCell>
          <GuestActions
            acting={actingId === guest.id}
            guest={guest}
            onDelete={onDelete}
            onDone={onDone}
          />
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function GuestActions({
  acting,
  guest,
  onDelete,
  onDone,
}: {
  acting: boolean;
  guest: GuestWithCount;
  onDelete: (guest: GuestWithCount) => void;
  onDone: () => void;
}) {
  const canDelete = guest._count.reservations === 0;

  return (
    <div className="flex items-center gap-1">
      <GuestFormDialog mode="edit" guest={guest} onDone={onDone} />
      {canDelete ? (
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={acting}
          onClick={() => onDelete(guest)}
          title="Excluir"
        >
          {acting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="text-destructive h-4 w-4" />
          )}
        </Button>
      ) : null}
    </div>
  );
}

function EmptyGuestsState({ canManage }: { canManage: boolean }) {
  return (
    <EmptyMessage
      message="Nenhum hóspede encontrado."
      hint={canManage ? "Clique em “Novo hóspede” para cadastrar." : undefined}
    />
  );
}

function filterGuests(guests: GuestWithCount[], search: string): GuestWithCount[] {
  const query = search.trim().toLowerCase();
  if (!query) return guests;
  return guests.filter((guest) => guestMatchesSearch(guest, query));
}

function guestMatchesSearch(guest: GuestWithCount, query: string): boolean {
  return (
    guest.name.toLowerCase().includes(query) ||
    (guest.document?.toLowerCase().includes(query) ?? false) ||
    (guest.email?.toLowerCase().includes(query) ?? false) ||
    (guest.phone?.toLowerCase().includes(query) ?? false)
  );
}
