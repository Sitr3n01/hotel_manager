# Banco de dados

Visão geral dos modelos Prisma e da relação com o Supabase Auth.

## Princípios

- **Prisma** é a fonte da verdade do schema `public`. Migrations são versionadas.
- **Supabase Auth** gerencia `auth.users` — outro schema, fora do alcance do Prisma.
- A ponte entre os dois mundos é a tabela `UserProfile`, mantida em sincronia por um **trigger PostgreSQL**.

## Modelos (resumo)

| Modelo | Propósito | Sprint que ativa |
|---|---|---|
| `UserProfile` | Perfil interno do usuário (espelho de `auth.users`) | 1 |
| `PermissionTag` | Catálogo de tags oficiais de permissão | 8 |
| `UserPermissionTag` | Tags concedidas/revogadas por usuário | 8 |
| `RoomType` | Tipos de quarto (Standard, Família, etc.) | 2 |
| `Room` | Quartos físicos do hotel | 2 |
| `Guest` | Hóspedes | 3 |
| `Reservation` | Reservas | 3 |
| `ProductCategory` | Categorias de produtos/insumos | 4 |
| `Product` | Produtos do estoque | 4 |
| `StockMovement` | Entrada, saída, desperdício, ajuste | 4 |
| `ReservationConsumption` | Consumo lançado em uma reserva | 5 |
| `FinancialClosing` | Fechamento financeiro da reserva | 5 |
| `AuditLog` | Log append-only de ações críticas | 1 (modelo); 8 (uso real) |

## Enums

- `Role` — ADMIN, GERENCIA, SECRETARIA, COZINHA, FINANCEIRO, UNASSIGNED
- `UserStatus` — PENDING, APPROVED, REJECTED, BLOCKED, INACTIVE
- `RoomStatus` — AVAILABLE, RESERVED, OCCUPIED, MAINTENANCE, CLEANING, BLOCKED
- `ReservationStatus` — PRE_RESERVED, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW
- `Unit` — UNIT, KG, G, L, ML, PACKAGE, BOX
- `MovementType` — IN, RESERVATION_CONSUMPTION, INTERNAL_CONSUMPTION, WASTE, POSITIVE_ADJUSTMENT, NEGATIVE_ADJUSTMENT
- `PaymentStatus` — PENDING, PARTIAL, PAID, CANCELLED
- `PaymentMethod` — CASH, PIX, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, OTHER

## Sincronização `auth.users` → `UserProfile`

`UserProfile.authUserId` é UUID e `@unique`, mas **não** é foreign key — o schema `auth` é gerenciado pelo Supabase e o Prisma não tem permissão para criar constraints cruzando schemas.

A integridade é mantida por um trigger:

```sql
-- prisma/manual/01_user_profile_trigger.sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();
```

A função insere uma linha em `UserProfile` com:
- `role = UNASSIGNED`, `status = PENDING`, `isActive = false` (sem acesso até aprovação)
- `name` deduzido de `raw_user_meta_data.name` ou da parte antes do `@` no email
- `isActive = true`

**Quando o trigger é necessário**:
- Sempre — não pode ser pulado, ou os usuários ficam órfãos sem perfil
- Reaplique após `npm run db:reset` (ele pode ser derrubado)

## Prevenção de overlap em reservas (Sprint 3)

A regra de "uma reserva por quarto por período" é validada em duas camadas:

1. **Aplicação** — `lib/availability.ts:findOverlappingReservation` é chamado por `lib/actions/reservation.ts` antes de criar/editar reservas. Devolve erro amigável em PT-BR ("Quarto já reservado de DD/MM a DD/MM").
2. **Banco** — exclusion constraint `reservation_no_overlap_per_room` em `prisma/manual/02_reservation_overlap_exclusion.sql`, aplicada manualmente (ver [SETUP.md §6b](SETUP.md#6b-aplicar-sql-constraint-de-reservas-sprint-3)).

```sql
alter table "Reservation"
  add constraint reservation_no_overlap_per_room
  exclude using gist (
    "roomId" with =,
    daterange("checkInDate", "checkOutDate", '[)') with &&
  )
  where (status in ('PRE_RESERVED', 'CONFIRMED', 'CHECKED_IN'));
```

A constraint só aplica para statuses **ocupantes** (`PRE_RESERVED`, `CONFIRMED`, `CHECKED_IN`). Reservas finalizadas (`CHECKED_OUT`, `CANCELLED`, `NO_SHOW`) podem coexistir com novas reservas no mesmo quarto/período — isso preserva o histórico. Requer extensão `btree_gist` (habilitada pelo próprio script).

A constraint é a **rede de segurança** para corner cases de concorrência (duas secretárias criando reservas no mesmo segundo). A validação principal continua na aplicação.

## Estratégia de deletes

Decisão de design: **não deletar dados de domínio fisicamente**. Use `isActive = false`. Mas o Prisma define cascades para casos legítimos:

| Origem | Destino | Política | Por quê |
|---|---|---|---|
| `Reservation` | `ReservationConsumption` | `Cascade` | Consumo só faz sentido enquanto a reserva existir |
| `Reservation` | `FinancialClosing` | `Cascade` | Fechamento é derivado da reserva |
| `Reservation` (deletar) | `StockMovement` | `SetNull` | Histórico do estoque continua, sem mais referenciar a reserva |
| `Product` | `StockMovement` | `Restrict` | Não permite deletar produto com movimentações — usar `isActive = false` |
| `UserProfile` | qualquer rastro de ação | `SetNull` | Auditoria continua, mas anonimiza o autor |
| `Room` / `Guest` / `RoomType` / `ProductCategory` | filhos | `Restrict` | Bloqueia delete acidental |

## Índices

Definidos no schema:

- `Reservation`: `(roomId, checkInDate, checkOutDate)` e `(status)` — busca de disponibilidade
- `Product`: `(categoryId, isActive)` — listagem filtrada
- `StockMovement`: `(productId, createdAt)`, `(reservationId)`, `(type, createdAt)` — relatórios
- `ReservationConsumption`: `(reservationId)` — fechamento
- `FinancialClosing`: `(paymentStatus)` — relatórios financeiros
- `AuditLog`: `(entity, entityId)` e `(actorId, createdAt)` — investigação

## RLS

Documentado em [RLS.md](RLS.md). Na Sprint 8, a segurança efetiva está nos guards server-side com Prisma; RLS fica preparada como camada adicional futura.
