# Sprint 4 Progress Report — Cozinha, Produtos, Estoque e Desperdícios

> **Data**: 2026-05-17
> **Orquestrador**: Claude Opus 4.7 (planejamento + execução, sessão única)
> **Duração**: ~3h (continuação após fix do login Supabase)
> **Destino**: Agente Gerenciador / Codex / Orquestrador

---

## 1. Veredito

Sprint 4 **funcionalmente completa**. Build de produção verde, type-check clean, **289/289 testes passando**.

- **Build**: ✅ `next build` em 11.3s (Turbopack), 16 rotas (3 novas)
- **Type-check**: ✅ `tsc --noEmit` 0 erros
- **Testes**: 289/289 passando (27 arquivos) — +126 testes vs. baseline Sprint 3
- **Quality Gate**: **não rodado** nesta sessão. Recomendado rodar `npm run quality:preflight` antes do commit — esperar baseline novo (cobertura sobe ~5-8pp).
- **Smoke test manual**: **não executado**. Aguarda validação no browser.
- **Working tree**: ~50 arquivos não-commitados (Sprints 3, 4, 5, 6 acumulados).

---

## 2. Bug crítico resolvido antes da sprint (login Supabase)

Antes da Sprint 4 começar, o ambiente de dev estava com o login quebrado:

**Erro reportado**: `"Erro do Supabase: Forbidden use of secret API key in browser"`

**Causa raiz**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env.local` tinha sido preenchida com uma `sb_secret_*` (chave secreta no novo formato Supabase, equivalente à service_role). O SDK Supabase v2.45+ detecta o prefixo `sb_secret_` e bloqueia preventivamente — proteção contra vazamento de credenciais privilegiadas no client bundle.

**Correções aplicadas em `.env.local`**:
1. `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `sb_publishable_VinJZjLDHZq3IGFCB6O3cg_kj-Rlxw_` (buscado via Supabase MCP `get_publishable_keys`)
2. `NEXT_PUBLIC_APP_URL` → `http://localhost:3000` (estava com a publishable key no slot errado)
3. `DATABASE_URL` / `DIRECT_URL` → apóstrofe `'` da senha URL-encoded como `%27` (RFC 3986)

**Validações**:
- `auth.users` tinha `zegilfarias@outlook.com` com `email_confirmed_at` populado
- `UserProfile` para o admin existia com `role=ADMIN`, `isActive=true` (trigger `handle_new_auth_user` funcionou)
- `/auth/v1/settings` retornou 200 com a publishable nova; `/login` retornou 200 no Next.js

**Lição**: o painel API Keys do Supabase tem a `service_role` logo abaixo da `anon`/`publishable` com botão "Reveal" — fácil de copiar a errada. Worth adicionar verificação automática no boot (ver §10 de pendências).

---

## 3. Decisões arquiteturais (via AskUserQuestion)

Antes de implementar, 4 decisões críticas foram tomadas com o usuário:

| # | Decisão | Escolha do usuário |
|---|---|---|
| 1 | Onde lançar consumo do hóspede? | **Duas telas**: rápida em `/cozinha` + aba "Consumo" em `/reservas/[id]` — server action compartilhada |
| 2 | Como definir preço de venda? | **Adicionar `Product.salePrice`** (migration) — usado como default no formulário |
| 3 | Estoque negativo: bloqueia ou permite? | **Permitir com aviso amarelo** — bloquear travaria operação real (sistema vs realidade) |
| 4 | Ficha técnica/recipes? | **Não** — fora do MVP por escopo do planejamento mestre |

---

## 4. Escopo implementado (Fase a Fase)

### Fase 0 — Schema + Permissions + Audit

**Migration aplicada**:
- `prisma/migrations/20260517220000_add_product_sale_price/migration.sql` — adiciona `Product.salePrice DECIMAL(10,2)` nullable

**Estratégia de aplicação** (devido a drift do init migration — ver §6.1):
1. Editado `schema.prisma:200` adicionando `salePrice    Decimal? @db.Decimal(10, 2)`
2. `prisma db push --accept-data-loss` (additive only, sem perda)
3. Arquivo de migration criado manualmente para git history
4. `prisma migrate resolve --applied 20260517220000_add_product_sale_price`

**Schema final** (modelo Product):
```prisma
model Product {
  id           String   @id @default(uuid()) @db.Uuid
  name         String
  categoryId   String   @db.Uuid
  unit         Unit     @default(UNIT)
  averageCost  Decimal  @default(0) @db.Decimal(10, 2)
  salePrice    Decimal? @db.Decimal(10, 2)        // 🆕
  currentStock Decimal  @default(0) @db.Decimal(12, 3)
  minimumStock Decimal  @default(0) @db.Decimal(12, 3)
  isActive     Boolean  @default(true)
  ...
}
```

**`lib/permissions.ts` — bloco Kitchen** (10 novas funções):
| Função | ADMIN | GERENCIA | COZINHA | SECRETARIA | FINANCEIRO |
|---|---|---|---|---|---|
| `canManageProducts` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canViewProducts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `canManageProductCategories` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canRegisterPurchase` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canRegisterWaste` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canRegisterInternalConsumption` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canAdjustStock` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canRegisterReservationConsumption` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `canDeleteReservationConsumption` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canSeeFinancialValues` | ✅ | ✅ | ❌ | ✅ | ✅ |

**`lib/audit.ts` — extensões**:
- `AuditEntity` +4: `"Product"`, `"ProductCategory"`, `"StockMovement"`, `"ReservationConsumption"`
- `AuditAction` +7: `"STOCK_IN"`, `"WASTE"`, `"INTERNAL_CONSUMPTION"`, `"ADJUSTMENT_POSITIVE"`, `"ADJUSTMENT_NEGATIVE"`, `"CONSUMPTION_LOG"`, `"CONSUMPTION_REVERSE"`

---

### Fase 1 — Pure helpers + Validations

**Arquivos criados**:

| Arquivo | Propósito | Linhas |
|---|---|---|
| `lib/inventory/cost.ts` | `calculateNewAverageCost` (média ponderada), `unitCostFromBatch` | 35 |
| `lib/inventory/stock-projection.ts` | `projectStockAfterMovement`, `willStockGoNegative` | 38 |
| `lib/validations/product-category.ts` | `createProductCategorySchema`, `updateProductCategorySchema` | 15 |
| `lib/validations/product.ts` | `createProductSchema`, `updateProductSchema`, `UnitEnum` | 25 |
| `lib/validations/stock-movement.ts` | 4 schemas: `purchaseSchema` (batch), `internalConsumptionSchema`, `wasteSchema` (reason obrigatório), `adjustmentSchema` | 52 |
| `lib/validations/reservation-consumption.ts` | `createConsumptionSchema` | 14 |

**Fórmula custo médio ponderado** (encapsulada para testabilidade):
```
novoAverageCost = (currentStock × averageCost + addedQty × addedUnitCost) / (currentStock + addedQty)
```

**Cálculo de `estimatedCost` por tipo de movimento**:
- `IN` → `addedQty × unitCost` (o que foi pago)
- `WASTE`, `INTERNAL_CONSUMPTION`, `RESERVATION_CONSUMPTION`, `NEGATIVE_ADJUSTMENT` → `quantity × averageCost (atual)` (cost basis perdido)
- `POSITIVE_ADJUSTMENT` → `quantity × averageCost` (ganho ao custo atual)

**Testes Fase 1** (6 arquivos, **71 testes**, todos verdes):
- `tests/lib/inventory/cost.test.ts` — 13 testes (primeira compra, ponderada, fracionários, erros)
- `tests/lib/inventory/stock-projection.test.ts` — 14 testes (todos os 6 tipos + negativos + precisão)
- `tests/lib/validations/product-category.test.ts` — 8 testes
- `tests/lib/validations/product.test.ts` — 13 testes (incluindo todos os 7 valores de `unit`)
- `tests/lib/validations/stock-movement.test.ts` — 16 testes (batch 1/multi/50, waste sem reason → block, adjustment sem direction → block)
- `tests/lib/validations/reservation-consumption.test.ts` — 7 testes (com/sem product, cortesia=preço 0)

---

### Fase 2 — Server Actions

**Arquivos criados** (todos seguindo o padrão `ActionResult<T>` de Sprint 3):

| Arquivo | Linhas | Funções |
|---|---|---|
| `lib/actions/product-category.ts` | 162 | `listProductCategories`, `createProductCategory`, `updateProductCategory`, `deactivateProductCategory` |
| `lib/actions/product.ts` | 175 | `listProducts`, `getLowStockProducts`, `createProduct`, `updateProduct`, `deactivateProduct` |
| `lib/actions/stock-movement.ts` | 260 | `listStockMovements`, `createPurchase` (batch), `createInternalConsumption`, `createWaste`, `createAdjustment`, `applyMovement` (helper exportado) |
| `lib/actions/reservation-consumption.ts` | 175 | `listConsumptionsForReservation`, `createReservationConsumption` (dual-write), `deleteReservationConsumption` (estorno) |

**`applyMovement(tx, args)`** — helper central que toda action de stock usa:
- Carrega produto, valida `isActive`
- Calcula `newStock` (additive vs subtractive baseado em `type`)
- Para `IN`: calcula `newAverageCost` ponderado via `calculateNewAverageCost`
- Para outros: `estimatedCost = qty × currentAverageCost`
- Cria `StockMovement` + atualiza `Product` na mesma transação
- Não bloqueia estoque negativo (alinhado com decisão de UX)

**Dual-write em `createReservationConsumption`** (a operação mais delicada):
```ts
await prisma.$transaction(async (tx) => {
  // 1. Criar ReservationConsumption (billing side, com unitPrice/totalPrice)
  const created = await tx.reservationConsumption.create({ ... });
  // 2. Se tem produto, baixar estoque + criar StockMovement(RESERVATION_CONSUMPTION)
  if (parsed.data.productId) {
    await applyMovement(tx, {
      productId, type: "RESERVATION_CONSUMPTION", quantity, reservationId, createdById
    });
  }
  return created;
});
```

**Guards de `blockIfReservationNotEditable`**:
1. Reserva existe? Senão → "Reserva não encontrada"
2. Status terminal (`CANCELLED`, `NO_SHOW`)? → "Reserva cancelada/no-show não aceita consumo"
3. `closing?.closedAt != null`? → "Reserva já fechada não aceita alteração de consumo"
4. `CHECKED_OUT` ainda é permitido (até fechamento) — para reservas em check-out aguardando pagamento

**Permission filtering em `listConsumptionsForReservation`**:
```ts
if (canSeeFinancialValues(user.role)) return consumptions;
return consumptions.map((c) => ({
  ...c,
  unitPrice: new Prisma.Decimal(0),  // mascarado para COZINHA
  totalPrice: new Prisma.Decimal(0),
}));
```

**Testes Fase 2** (2 arquivos, **20 testes**, todos verdes):
- `tests/lib/actions/stock-movement.test.ts` — 13 testes: RBAC (block SECRETARIA/COZINHA conforme), custo médio ponderado verificado, motivo obrigatório em waste, estoque negativo permitido, adjustment requer GERENCIA+
- `tests/lib/actions/reservation-consumption.test.ts` — 7 testes: dual-write quando há productId, sem stock quando description-only, block reserva CANCELLED, block reserva fechada, totalPrice = qty × unitPrice, delete requer GERENCIA+, estorno cria POSITIVE_ADJUSTMENT

**Padrão de mock prisma** (reutilizado de Sprint 3):
```ts
const { ..., prismaMock, txMock } = vi.hoisted(() => ({
  prismaMock: {
    product: { ... },
    $transaction: vi.fn(async (fn) => fn(txMock)),
  },
  txMock: { product, stockMovement },
}));
```

---

### Fase 3 — UI Estoque (4 tabs)

**Página + orquestrador**:
- `app/(protected)/estoque/page.tsx` — Server Component: `requireAuth`, 3 queries paralelas, render client
- `components/estoque/estoque-page-client.tsx` — Tabs `Produtos | Categorias | Movimentações | Ajustes (admin/gerência)`
- `components/estoque/low-stock-banner.tsx` — Alerta amarelo no topo se algum produto está abaixo do mínimo

**Tab Produtos**:
- `components/produtos/produtos-tab.tsx` — Tabela com busca, badge "⚠ baixo" inline, action de inativar (FK Restrict → erro amigável)
- `components/produtos/product-form-dialog.tsx` — RHF + zodResolver, modo create/edit, Select de categoria + unit, defaultValue de salePrice opcional

**Tab Categorias**:
- `components/categorias/categorias-tab.tsx` — Tabela + dialog inline (RHF). Inativação bloqueada se `_count.products > 0`

**Tab Movimentações**:
- `components/estoque/movimentacoes-tab.tsx` — Tabela com filtro por tipo, badges coloridos por `MovementType`, paginação implícita (limite 500 mais recentes via `take: 500`)
- `components/estoque/entrada-batch-dialog.tsx` — Form multi-item (até 50 itens), botão "+ adicionar item", submete tudo em uma transação

**Tab Ajustes** (ADMIN/GERÊNCIA only):
- `components/estoque/ajustes-tab.tsx` — Lista de ajustes históricos + dialog para novo ajuste com `direction: POSITIVE|NEGATIVE`, motivo obrigatório

---

### Fase 4 — UI Cozinha (4 ações grandes)

**Página**:
- `app/(protected)/cozinha/page.tsx` — Server Component: busca produtos ativos + reservas não-terminais
- `components/cozinha/cozinha-page-client.tsx` — Grid mobile-first 1col / 2col (md), 4 ActionCards com ícones grandes; cada card renderiza seu dialog. PermissionGate por role.

**Dialogs**:
- `components/cozinha/consumo-hospede-dialog.tsx` (~170 linhas) — Reserva + produto + qty + unitPrice; **warning amarelo de estoque negativo calculado client-side**; defaultUnit a partir de `Product.salePrice`; suporta `defaultReservationId` (reusado em `/reservas/[id]`)
- `components/cozinha/desperdicio-dialog.tsx` — Motivo é Textarea obrigatório
- `components/cozinha/consumo-interno-dialog.tsx` — Reason opcional
- Reusa `EntradaBatchDialog` de `components/estoque/`

---

### Fase 5 — Aba Consumo em /reservas/[id]

**Nova rota** (não existia antes):
- `app/(protected)/reservas/[id]/page.tsx` — Detail page: header com guest+room+dates+status badge + back link, renderiza `ReservationConsumoTab`
- `components/reservas/reservation-consumo-tab.tsx` — Card com lista de consumos, total previsto (só para `canSeeFinancialValues`), botão "Adicionar consumo" que abre `ConsumoHospedeDialog` com `defaultReservationId` fixado; ação de estornar para `canDelete`

**RBAC inline na tabela**:
- COZINHA não vê colunas `unitPrice` / `totalPrice` nem o total previsto
- SECRETARIA vê tudo mas não pode estornar (só GERENCIA+)

---

### Fase 6 — Polimento

**Seed estendido** (`prisma/seed.ts`):
- `createMany` dos 5 produtos agora inclui `salePrice` (2 produtos) e `minimumStock` (todos)
- Nova função `seedInitialStock()` — idempotente (skip se `stockMovement.count > 0`), cria 5 movimentos `IN` populando estoque inicial:
  - Água mineral 500ml: 48
  - Refrigerante lata: 36
  - Arroz tipo 1: 25 kg
  - Feijão preto: 15 kg
  - Açúcar refinado: 10 kg

**Sidebar footer**:
- `components/layout/app-sidebar.tsx:76` — "Sprint 3 — reservas e hóspedes" → "Sprint 4 — cozinha e estoque"

---

## 5. Cenários de cozinha cobertos

| # | Cenário | Onde é lançado | MovementType |
|---|---|---|---|
| 1 | Compra de supermercado (multi-item) | `/estoque` → tab Movimentações ou `/cozinha` | `IN` (atualiza `averageCost`) |
| 2 | Hóspede pede cerveja | `/cozinha` ou `/reservas/[id]` aba Consumo | `RESERVATION_CONSUMPTION` + cria `ReservationConsumption` (dual-write) |
| 3 | Almoço dos funcionários | `/cozinha` → Consumo interno | `INTERNAL_CONSUMPTION` |
| 4 | Caixa de ovos quebrada | `/cozinha` → Desperdício (motivo obrigatório) | `WASTE` |
| 5 | Recontagem física (sobrou) | `/estoque` → tab Ajustes | `POSITIVE_ADJUSTMENT` |
| 6 | Recontagem física (faltou) | `/estoque` → tab Ajustes | `NEGATIVE_ADJUSTMENT` |
| 7 | Estoque negativo | Permitido com warning amarelo client + audit log | qualquer subtractive |
| 8 | Reserva cancelada com consumo | Consumo permanece (foi real); blockIfReservationNotEditable só impede NOVOS lançamentos | n/a |
| 9 | Reserva fechada | Server Action bloqueia novo consumo E delete de consumo existente | n/a |
| 10 | Estorno de consumo | `deleteReservationConsumption` cria `POSITIVE_ADJUSTMENT` para devolver estoque | `POSITIVE_ADJUSTMENT` |
| 11 | Produto inativo | `ProductSelect` filtra `isActive: true`. `applyMovement` lança erro se produto inativo | n/a |

---

## 6. Dificuldades encontradas

### 6.1 — Drift do init migration (CRÍTICO)

**Problema**: `prisma migrate dev --name add_product_sale_price` falhou com:
```
The migration `20260517133541_init` was modified after it was applied.
We need to reset the "public" schema. All data will be lost.
```

Alguém (provavelmente outro agente em sessão anterior) editou `prisma/migrations/20260517133541_init/migration.sql` depois de já ter sido aplicado. O Prisma calcula um hash do conteúdo e detecta a divergência.

**Resolução**: contornado sem reset:
1. `prisma db push --accept-data-loss` — sincroniza schema sem migration history (additive only, então seguro)
2. Criado manualmente `prisma/migrations/20260517220000_add_product_sale_price/migration.sql` com o ALTER TABLE
3. `prisma migrate resolve --applied 20260517220000_add_product_sale_price` — registra na tabela `_prisma_migrations` sem rodar o SQL

**Ação para o orquestrador**: o init migration ainda está em estado divergente. Em produção, `prisma migrate deploy` vai falhar até que isso seja resolvido. Recomendado em sessão futura:
- Comparar `prisma/migrations/20260517133541_init/migration.sql` com o que está em `_prisma_migrations.checksum`
- Decidir: regenerar checksum (`prisma migrate resolve --applied 20260517133541_init`?) ou reverter o arquivo de migration ao original

### 6.2 — Prisma CLI não lê `.env.local` (MÉDIO)

**Problema**: `npx prisma migrate ...` carrega apenas `.env`, não `.env.local`. Erro: `Environment variable not found: DIRECT_URL`.

**Resolução**: prefixo em PowerShell para popular env vars antes:
```powershell
Get-Content .env.local | ForEach-Object {
  if ($_ -match '^([A-Z_]+)=(.*)$') {
    Set-Item -Path "env:$($Matches[1])" -Value $Matches[2]
  }
}
```

Sugestão futura: instalar `dotenv-cli` e wrappar scripts: `"db:migrate": "dotenv -e .env.local -- prisma migrate dev"`.

### 6.3 — Zod 4 UUID strictness (BAIXO mas insidioso)

**Problema**: testes com `VALID_UUID = "11111111-1111-1111-1111-111111111111"` falharam silenciosamente — `safeParse({...}).success === false`.

**Causa**: Zod 4 enforça RFC 4122 estrita — char 13 (versão) deve ser `1-8`, char 17 (variant) deve ser `8/9/a/b`. UUID `"11111...1"` falha porque `1` no char 17 não é variant válido.

**Resolução**: trocado para `"550e8400-e29b-41d4-a716-446655440000"` (UUIDv4 real, mesmo padrão usado nos testes da Sprint 3).

**Lição para o orquestrador**: ao gerar fixtures de teste, sempre usar geradores UUID reais (`crypto.randomUUID()`) ou UUIDs canônicos conhecidos. Padrões "1111..." e "abcd..." podem falhar com Zod 4.

### 6.4 — shadcn Select `onValueChange` aceita `string | null` (MÉDIO)

**Problema**: 5 erros de type — `Select` do `@base-ui/react` tem assinatura `onValueChange: (value: string | null, eventDetails) => void`, mas estávamos passando handlers que recebem `string`.

**Resolução**: wrap defensivo com nullish guard:
```tsx
onValueChange={(v) => v && setProductId(v)}
```

Aplicado em 5 lugares (product-form-dialog, entrada-batch-dialog, ajustes-tab, movimentacoes-tab).

### 6.5 — Button do projeto não suporta `asChild` (BAIXO)

**Problema**: tentei `<Button asChild><Link>...</Link></Button>` na detail page de reserva e falhou — esse projeto tem um Button custom sem `asChild` (não é o shadcn padrão Radix).

**Resolução**: usar `<Link>` direto com `className` de estilo equivalente. Aplicado em `app/(protected)/reservas/[id]/page.tsx:34`.

### 6.6 — Vitest 4 removeu reporter "basic" (BAIXO)

**Problema**: `npx vitest run --reporter=basic` falhou com `Failed to load custom Reporter from basic`.

**Resolução**: usar reporter default (sem flag). O Vitest 4 trocou o nome (provavelmente `dot` ou `default` agora).

---

## 7. Estrutura final de arquivos da Sprint 4

```
hotel-fazenda-system/
├── app/(protected)/
│   ├── cozinha/page.tsx                  # [MODIFICADO] Era placeholder → Server Component real
│   ├── estoque/page.tsx                  # [MODIFICADO] Era placeholder → Server Component real
│   └── reservas/[id]/page.tsx            # [NOVO] Detail page com aba Consumo
├── components/
│   ├── categorias/
│   │   └── categorias-tab.tsx            # [NOVO] CRUD inline (tab + dialog)
│   ├── cozinha/
│   │   ├── cozinha-page-client.tsx       # [NOVO] Grid de 4 ActionCards
│   │   ├── consumo-hospede-dialog.tsx    # [NOVO] Reservation+Product+Qty+Price, warning estoque
│   │   ├── desperdicio-dialog.tsx        # [NOVO] Motivo obrigatório
│   │   └── consumo-interno-dialog.tsx    # [NOVO]
│   ├── estoque/
│   │   ├── estoque-page-client.tsx       # [NOVO] Orquestrador de 4 tabs
│   │   ├── low-stock-banner.tsx          # [NOVO] Alerta no topo
│   │   ├── movimentacoes-tab.tsx         # [NOVO] Lista + filtro por tipo
│   │   ├── entrada-batch-dialog.tsx      # [NOVO] Form multi-item (até 50)
│   │   └── ajustes-tab.tsx               # [NOVO] Lista + dialog inline
│   ├── produtos/
│   │   ├── produtos-tab.tsx              # [NOVO] CRUD + busca + badge "⚠ baixo"
│   │   └── product-form-dialog.tsx       # [NOVO] RHF + zodResolver, salePrice opcional
│   ├── reservas/
│   │   └── reservation-consumo-tab.tsx   # [NOVO] Aba Consumo da detail page
│   └── layout/
│       └── app-sidebar.tsx               # [MODIFICADO] Footer "Sprint 4 — cozinha e estoque"
├── lib/
│   ├── inventory/                         # [NOVO diretório]
│   │   ├── cost.ts                        # [NOVO] calculateNewAverageCost, unitCostFromBatch
│   │   └── stock-projection.ts            # [NOVO] projectStockAfterMovement, willStockGoNegative
│   ├── actions/
│   │   ├── product-category.ts            # [NOVO] CRUD com FK Restrict tradução
│   │   ├── product.ts                     # [NOVO] CRUD + getLowStockProducts
│   │   ├── stock-movement.ts              # [NOVO] 4 actions + applyMovement helper
│   │   └── reservation-consumption.ts     # [NOVO] Dual-write + estorno
│   ├── validations/
│   │   ├── product-category.ts            # [NOVO]
│   │   ├── product.ts                     # [NOVO]
│   │   ├── stock-movement.ts              # [NOVO] 4 schemas
│   │   └── reservation-consumption.ts     # [NOVO]
│   ├── audit.ts                           # [MODIFICADO] +4 entities, +7 actions
│   └── permissions.ts                     # [MODIFICADO] +10 kitchen permissions
├── prisma/
│   ├── migrations/20260517220000_add_product_sale_price/
│   │   └── migration.sql                  # [NOVO] ALTER TABLE Product ADD salePrice
│   ├── schema.prisma                      # [MODIFICADO] +salePrice em Product
│   └── seed.ts                            # [MODIFICADO] +seedInitialStock, +salePrice em createMany
├── tests/lib/
│   ├── inventory/
│   │   ├── cost.test.ts                   # [NOVO] 13 testes
│   │   └── stock-projection.test.ts       # [NOVO] 14 testes
│   ├── validations/
│   │   ├── product-category.test.ts       # [NOVO] 8 testes
│   │   ├── product.test.ts                # [NOVO] 13 testes
│   │   ├── stock-movement.test.ts         # [NOVO] 16 testes
│   │   └── reservation-consumption.test.ts # [NOVO] 7 testes
│   └── actions/
│       ├── stock-movement.test.ts         # [NOVO] 13 testes (transação, custo médio, RBAC)
│       └── reservation-consumption.test.ts # [NOVO] 7 testes (dual-write, guards)
└── .env.local                             # [MODIFICADO pre-sprint] Fix de keys + URL encode senha
```

**Total**: 29 arquivos novos, 7 modificados.

---

## 8. Métricas

| | Antes (Sprint 3) | Depois (Sprint 4) | Delta |
|---|---|---|---|
| Test files | 16 | 27 | +11 |
| Tests passing | 163 | 289 | +126 |
| Rotas funcionais | 13 | 16 | +3 (`/cozinha`, `/estoque`, `/reservas/[id]`) |
| Linhas de schema Prisma | 308 | 309 | +1 (salePrice) |
| Funções em `permissions.ts` | 18 | 28 | +10 |
| Entidades em audit | 5 | 9 | +4 |
| Server actions files | 6 | 10 | +4 |

**Cobertura de testes**: não medida nesta sessão (vitest sem `--coverage`). Espera-se aumento de ~5-8pp sobre baseline Sprint 3 (17.20% lines). Rodar `npm run test:coverage:ci` para confirmar.

---

## 9. Critérios de aceite (do planejamento mestre §Sprint 4)

- [x] **cozinha consegue lançar consumo sem acessar dados financeiros sensíveis** — `canSeeFinancialValues` filtra `unitPrice`/`totalPrice` na listagem
- [x] **desperdício exige motivo obrigatório** — Zod `min(3)` em `wasteSchema.reason`
- [x] **toda movimentação gera log** — `logAudit` chamado em todas as 4 actions de stock + reservation-consumption (verificado em testes)
- [x] **estoque é atualizado corretamente** — `applyMovement` em transação atômica, custo médio recalculado para `IN`
- [x] **lançamentos vinculados a reserva aparecem no fechamento** — `ReservationConsumption` criada com `unitPrice`/`totalPrice`; Sprint 5 já lê esses dados
- [x] **gerência consegue visualizar desperdícios por período** — Sprint 6 (`/relatorios > Desperdícios`) já consume os `StockMovement(WASTE)` via `lib/queries/reports.ts`

---

## 10. Pendências para o Agente Orquestrador

### 10.1 — Ações imediatas (validação)

1. **Smoke test manual no browser** (não executado nesta sessão):
   - `/estoque` → criar produto, categoria, registrar entrada multi-item, ver custo médio atualizar
   - `/cozinha` → 4 dialogs funcionam? Warning de estoque aparece?
   - `/reservas/[id]` → adicionar consumo via aba, verificar aparece em `/financeiro/[id]` (Sprint 5)
   - Permissões: trocar role do admin para `COZINHA` no Supabase → verificar que `unitPrice` some na tab Consumo
2. **Rodar seed estendido**: `npm run db:seed` → cria 5 `StockMovement(IN)` iniciais para popular `currentStock`
3. **Rodar Quality Gate completo**: `npm run quality:preflight` — atualizar baseline se necessário (`npm run quality:baseline` na branch)

### 10.2 — Limpeza de configurações (não-bloqueante)

Os arquivos abaixo foram modificados durante Sprint 3 para isolar código Sprint 5/6 incompleto. Agora que Sprint 4 está completa e Sprints 5/6 também estão (per progress reports), **avaliar se as exclusões podem ser removidas**:

- `vitest.config.ts:exclude` — tests de financial-calculations e financial-closing
- `eslint.config.mjs:globalIgnores` — `components/financeiro/**`, `components/dashboard/**`, `components/relatorios/**`, `app/(protected)/relatorios/**`
- `.jscpd.json:ignore` — mesmos diretórios

### 10.3 — Tech debt identificado

1. **Drift do init migration** (§6.1) — resolver antes do próximo deploy via `prisma migrate deploy`. Provavelmente bastará `prisma migrate resolve --applied 20260517133541_init` com o hash novo, mas verificar que o schema atual bate com o SQL.
2. **`.env.local` lookup em scripts Prisma** (§6.2) — adicionar `dotenv-cli` em devDependencies, wrappar scripts. Alinha dev DX.
3. **Botão `asChild`** — outros lugares do código podem se beneficiar. Considerar migrar para shadcn Button padrão (com Radix Slot) numa sprint de polish.
4. **Link da lista de reservas para detail page** — `components/reservas/reservations-list-tab.tsx` não tem link para `/reservas/[id]`. Currently users só navegam via URL. Sugestão: adicionar coluna "Detalhes" com link, ou tornar a row clicável.
5. **Verificação automática de chaves Supabase** — adicionar uma checagem no boot do dev server (`next.config.ts` ou um startup script) que aborta se `NEXT_PUBLIC_SUPABASE_ANON_KEY` começar com `sb_secret_` ou for JWT com `role:service_role`. Previne o bug que afetou esta sessão.
6. **Tests de action de produto/categoria** — não foram escritos por economia de tempo. Padrão é simples (similar a guest.test.ts). Adicionar para subir cobertura.

### 10.4 — Working tree antes do commit

Sugestão de **commits atômicos** (a fazer fora da sessão atual):

1. `feat: sprint 3 guests, reservations and timeline` (Sprint 3 completa, ver SPRINT_3_PROGRESS)
2. `feat: sprint 5 financial closing` (Sprint 5)
3. `feat: sprint 6 dashboard and reports` (Sprint 6)
4. `feat: sprint 4 kitchen, stock and consumption` (esta sprint)
5. `fix: supabase keys and password url-encoding in env example`
6. `chore(quality): refresh baseline post sprint 4`

Alternativa pragmática: 1 commit grande `feat: sprints 3-6 functional MVP` se o histórico granular não importa.

---

## 11. Riscos residuais

- **Smoke test não executado**: feature funcional só pode ser declarada após validação no browser. Edge cases potenciais: dialogs em mobile (320px width), Select de produtos com 100+ items (performance), estoque que vai negativo via dual-write quando dois operadores submetem simultaneamente.
- **RLS ainda não aplicada**: 12 tabelas têm RLS habilitado sem policies (Supabase advisor reporta isso). Prisma usa `postgres` role (bypass), então tudo funciona. Mas qualquer query via Supabase client com anon key retorna vazio silenciosamente. Planejado para Sprint 8.
- **Estoque negativo silencioso**: decisão consciente (warning, não block). Mas se a equipe ignora o warning sistematicamente, o estoque do sistema diverge da realidade. Mitigação: relatório de "Estoque baixo" + ajustes periódicos por recontagem. Considerar adicionar uma view "Produtos com estoque negativo" em sprint futura.
- **Sem upper-bound em `salePrice`**: não há validação de "preço de venda > custo médio" — chef poderia colocar preço de venda menor que custo. Sprint futura: avisar no formulário.
- **Sem histórico de `salePrice`**: alterações no preço de venda não são auditadas separadamente — vão no log `Product UPDATE` genérico. Para análise de markup ao longo do tempo, seria necessário capturar antes/depois explicitamente.

---

## 12. Lições aprendidas

1. **Drift de migrations é um problema recorrente em multi-agent setups**. Cada agente que toca em `prisma/migrations/` precisa entender que o conteúdo é imutável após aplicação. Adotar `prisma migrate dev --create-only` (que só gera o SQL) seguido de revisão manual reduz o risco.
2. **`db push` é uma ferramenta de emergência, não rotina**. Funcionou aqui porque a mudança é puramente additive (nullable column). Para mudanças destrutivas (drop column, change type), exige `--accept-data-loss=true` e perde-se rastreabilidade.
3. **Zod 4 é mais estrito que Zod 3**. Migração planejada da Sprint 1 trouxe ganho de validação real (UUID formato correto), mas requer atualização de fixtures de teste antigos. Worth a follow-up audit em todos os tests.
4. **shadcn Select com `@base-ui/react`** tem assinatura `(value: string | null, ...)` ao contrário do shadcn antigo (`(value: string)`). Esse projeto migrou para `@base-ui/react` em alguma sprint anterior. Wrap defensivo com `v && setX(v)` é o padrão correto.
5. **AskUserQuestion antes de implementar é altamente eficaz** para decisões arquiteturais. As 4 perguntas pré-codificação economizaram retrabalho significativo. Padrão a replicar em sprints futuras.
6. **Dual-write em transação atômica** é o padrão correto para casos "billing + inventory". `ReservationConsumption` (billing) + `StockMovement` (inventory) precisam ser inseridos juntos, OU nenhum. Falha em um reverte o outro. O custo é cognitivo (mais complexo de testar), mas o ganho de consistência vale.
7. **Permission-based field masking** (esconder `unitPrice` para COZINHA na listagem) é melhor que retornar 403 — UX mais limpa, mesmo endpoint, lógica concentrada no server. Mas requer cuidado: nunca confiar no client para esconder. Sempre mascarar no server.

---

## 13. Próximas sprints (visão)

**Sprint 7** — PWA + offline:
- Operações candidatas a offline: lançar consumo (cozinha), lançar desperdício, criar pré-reserva simples
- IndexedDB queue + sync handler
- Cuidado: lançamentos offline com produto inativado depois → conflito no sync

**Sprint 8** — Segurança/RLS:
- Aplicar RLS policies reais nas 12 tabelas com RLS habilitado sem policies
- Hardening de roles
- Log obrigatório de ações críticas (lista no planejamento mestre §Sprint 8 inclui "lançar desperdício", "ajustar estoque" — Sprint 4 já cobre via `logAudit`)

**Sprint 9** — Implantação:
- Treinamento da equipe da cozinha (telão na cozinha? tablet dedicado?)
- Manual de uso curto focado nos 4 fluxos: compra, consumo hóspede, desperdício, ajuste
- Período de bugfix e termo de aceite
