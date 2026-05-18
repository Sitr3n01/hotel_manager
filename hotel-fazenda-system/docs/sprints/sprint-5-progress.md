# Sprint 5 — Progress Report: Consumo por Reserva e Fechamento da Estadia

**Data:** 2026-05-17
**Status:** Em progresso (fases independentes concluídas)
**Branch:** main

---

## Resumo

A Sprint 5 está sendo implementada em paralelo com as Sprints 3 (Reservas + Hóspedes) e 4 (Cozinha + Estoque). Para viabilizar o paralelismo, a sprint foi dividida em três categorias:

- 🟢 **Zero dependência** — codado AGORA
- 🟡 **Depende só dos tipos** (já existem no schema Prisma) — codado AGORA
- 🔴 **Depende das Sprints 3/4 prontas** — esperar

---

## O que foi concluído

### 1. Funções puras de cálculo financeiro

**Arquivo:** `lib/financial-calculations.ts`

| Função | Descrição |
|--------|-----------|
| `calculateNights(checkIn, checkOut)` | Número de noites entre duas datas. Day-use (mesma data) = 0. Lança erro se checkout < checkin. |
| `calculateDailyTotal(nights, dailyRate)` | Total de diárias = noites × valor da diária |
| `calculateConsumptionTotal(items)` | Soma de quantidade × valor unitário para array de itens |
| `calculateFinalTotal(daily, consumption, discount, extra)` | Total final com clamp para 0 (nunca negativo) |
| `formatCurrency(value)` | Formata `Prisma.Decimal` → `"R$ X.XXX,XX"` |

**Decisões de design:**
- Todas as funções são puras (zero dependências externas) — testáveis sem Prisma, banco ou auth
- Usam `Prisma.Decimal` para evitar imprecisão de ponto flutuante do IEEE 754
- `calculateFinalTotal` tem clamp para 0 — total negativo não tem significado de negócio

### 2. Schemas de validação

**Arquivo:** `lib/validations/financial-closing.ts`

| Schema | Uso |
|--------|-----|
| `financialClosingSchema` | Validação client-side (RHF) — campos de fechamento |
| `financialClosingServerSchema` | Validação server-side — estende o client com `superRefine`: acréscimo > 0 exige justificativa |
| `reopenClosingSchema` | Validação de reabertura — motivo obrigatório, mínimo 10 caracteres |

**Tipos exportados:** `FinancialClosingInput`, `ReopenClosingInput`

### 3. Permissões financeiras

**Arquivo:** `lib/permissions.ts` (estendido)

| Função | ADMIN | GERENCIA | FINANCEIRO | SECRETARIA | COZINHA |
|--------|-------|----------|------------|------------|---------|
| `canCloseReservation` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `canReopenClosing` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canEditPaymentStatus` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canViewFinancial` | ✅ | ✅ | ✅ | ✅ | ❌ |

### 4. Auditoria

**Arquivo:** `lib/audit.ts` (estendido)

Novos tipos adicionados:
- Entidade: `FinancialClosing`
- Ações: `CLOSE`, `REOPEN`, `DISCOUNT`, `EXTRA_CHARGE`, `PAYMENT_STATUS`, `PAYMENT_METHOD`, `EXPORT`

A função `logAudit()` não precisou ser alterada — já era genérica o suficiente.

### 5. Componentes presentacionais

**Diretório:** `components/financeiro/`

| Componente | Arquivo | Props | Descrição |
|-----------|---------|-------|-----------|
| `FinanceiroSummaryCards` | `financeiro-summary-cards.tsx` | `summary: ClosingSummary` | 4 cards: Pendente (âmbar), Parcial (azul), Pago (verde), Total Previsto (slate) |
| `FinanceiroFilters` | `financeiro-filters.tsx` | Status + date range callbacks | Select de PaymentStatus + inputs de data |
| `FinanceiroTable` | `financeiro-table.tsx` | `closings: ClosingWithRelations[]`, `userRole` | Tabela com 10 colunas + empty state + links para detalhes |
| `FechamentoPagamentoSection` | `fechamento-pagamento-section.tsx` | Status, método, isClosed, callbacks | Card com borda colorida, badge + ícone do método, ícone de lock se fechado |
| `FechamentoExportButton` | `fechamento-export-button.tsx` | `closingId`, `disabled?` | Botão que abre API route de Excel em nova aba |

**Decisão de design:** Todos os componentes recebem dados por props (não fazem fetch internamente). Isso permite que sejam desenvolvidos e testados independentemente das Server Actions — quando as Sprints 3/4 estabilizarem, é só conectar.

### 6. Testes

| Arquivo | Testes | Cobertura |
|---------|--------|-----------|
| `tests/lib/financial-calculations.test.ts` | 22 | `calculateNights` (5), `calculateDailyTotal` (4), `calculateConsumptionTotal` (4), `calculateFinalTotal` (5), `formatCurrency` (4) |
| `tests/lib/validations/financial-closing.test.ts` | 18 | `financialClosingSchema` (9), `financialClosingServerSchema` (4), `reopenClosingSchema` (5) |
| `tests/lib/permissions.test.ts` | 20 | Matriz 5 roles × 4 funções |

**Total: 60 novos testes, todos passando.**

### 7. Dependência

- `xlsx` (SheetJS) instalado — pronto para a API Route de exportação Excel

---

## O que falta (🔴 — depende das Sprints 3 e 4)

### Server Actions

**Arquivo:** `lib/actions/financial-closing.ts` (a ser criado)

| Action | Dependência |
|--------|-------------|
| `getClosingData(reservationId)` | Sprint 3 (Reservation queries) + Sprint 4 (ReservationConsumption queries) |
| `listFinancialClosings(params)` | Sprint 3 (Reservation includes) |
| `upsertFinancialClosing(input)` | Sprint 3 (Reservation status check) + Sprint 4 (consumption calc) |
| `finalizeClosing(id)` | Sprint 3 (Reservation status transition → CHECKED_OUT) |
| `reopenClosing(id, input)` | Sprint 3 (Reservation status revert → CHECKED_IN) |
| `updatePaymentStatus(id, status, method?)` | Nenhuma além do próprio FinancialClosing |
| `getClosingSummary()` | Agregação SQL sobre FinancialClosing |

### Páginas

| Rota | Arquivo | Status atual |
|------|---------|-------------|
| `/financeiro` | `app/(protected)/financeiro/page.tsx` | Placeholder (`ModulePlaceholder`) |
| `/financeiro/[id]` | `app/(protected)/financeiro/[id]/page.tsx` | A ser criado |
| `/api/export/fechamento/[id]` | `app/api/export/fechamento/[id]/route.ts` | A ser criado |

### Componentes que dependem de Server Actions

| Componente | Dependência |
|-----------|-------------|
| `financeiro-page-client.tsx` | `listFinancialClosings` + `getClosingSummary` |
| `fechamento-detail-client.tsx` | `getClosingData` |
| `fechamento-form-dialog.tsx` | `upsertFinancialClosing` |
| `fechamento-consumo-table.tsx` | Dados de `ReservationConsumption[]` |
| `fechamento-reopen-dialog.tsx` | `reopenClosing` |

### Infra

- `prisma/seed.ts` — adicionar dados financeiros de exemplo
- `components/layout/app-sidebar.tsx` — atualizar footer "Sprint 2" → "Sprint 5"
- Testes manuais (14 passos da especificação)
- Quality Gate final com build passando

---

## Bugs conhecidos em outras sprints

| Bug | Arquivo | Sprint | Descrição |
|-----|---------|--------|-----------|
| Type error | `components/reservas/reservation-form-dialog.tsx:141` | 3 | `checkInDate: Date \| undefined` não atribuível a `Date` — o `FormValues` está inconsistente com o schema Zod |

Este bug bloqueia o build (`npm run build`) mas não afeta os testes da Sprint 5.

---

## Próximos passos

1. Aguardar a Sprint 3 estabilizar (build voltar a passar)
2. Aguardar a Sprint 4 entregar o módulo de consumo por reserva
3. Implementar `lib/actions/financial-closing.ts` (7 Server Actions)
4. Substituir placeholder de `/financeiro` pela página real
5. Criar páginas de detalhes e API Route de Excel
6. Criar os 5 componentes que dependem de Server Actions
7. Atualizar seed e sidebar
8. Executar os 14 testes manuais da especificação
9. Rodar Quality Gate completo

---

## Regras de negócio implementadas

1. ✅ **Total final nunca negativo** — `calculateFinalTotal` clampa para 0
2. ✅ **Acréscimo exige justificativa** — `financialClosingServerSchema.superRefine`
3. ⬜ **Desconto > 20% da diária exige justificativa** — será implementado na Server Action `upsertFinancialClosing`
4. ✅ **Reabertura exige motivo ≥ 10 caracteres** — `reopenClosingSchema`
5. ⬜ **Trava pós-fechamento** — será implementada na Server Action `finalizeClosing` + UI
6. ✅ **Permissões granulares** — 4 funções em `permissions.ts`
7. ⬜ **Audit log em todas as mutações** — chamadas a `logAudit()` serão feitas nas Server Actions
