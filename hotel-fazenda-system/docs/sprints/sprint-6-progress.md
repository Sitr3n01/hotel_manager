# Sprint 6 — Progress Report (Dashboard + Relatórios)

**Status: ~95% concluído** | **Data: 2026-05-17**

---

## Objetivo da Sprint

Criar painéis e relatórios para que a gerência acompanhe ocupação, receita, gastos de cozinha, desperdício e desempenho operacional. Transformar dados operacionais das Sprints 1-5 em informação útil para decisão.

---

## Arquivos criados pela Sprint 6 (23 novos)

### Camada de dados (3)

| Arquivo | Propósito |
|---------|-----------|
| `lib/date-periods.ts` | Tipo `DateRange`, tipo `PeriodPreset`, função `getDateRange()` com 5 presets (hoje, 7d, mês atual, mês anterior, personalizado) |
| `lib/queries/dashboard.ts` | 9 funções de query para cards + 4 funções de agregação para gráficos (`server-only`) |
| `lib/queries/reports.ts` | 7 funções de query para as abas de relatórios (`server-only`) |

### Componentes do Dashboard (9)

| Arquivo | Propósito |
|---------|-----------|
| `components/dashboard/metric-card.tsx` | Card reutilizável (ícone colorido + valor + título + descrição) |
| `components/dashboard/chart-card.tsx` | Card wrapper para gráficos (Card + título + descrição + children) |
| `components/dashboard/date-range-filter.tsx` | "use client" — Select de presets + DatePicker condicional para período personalizado |
| `components/dashboard/permission-gate.tsx` | "use client" — Renderiza children condicionalmente baseado na role |
| `components/dashboard/revenue-chart.tsx` | "use client" — Recharts BarChart: receita por dia |
| `components/dashboard/occupancy-chart.tsx` | "use client" — Recharts PieChart: ocupação por status de quarto |
| `components/dashboard/waste-chart.tsx` | "use client" — Recharts BarChart: desperdício por categoria |
| `components/dashboard/consumption-chart.tsx` | "use client" — Recharts BarChart horizontal: top 10 produtos consumidos |
| `components/dashboard/dashboard-page-client.tsx` | "use client" — Orquestrador: grid de 9 cards + 4 gráficos + PermissionGate + filtro |

### Componentes dos Relatórios (10)

| Arquivo | Propósito |
|---------|-----------|
| `components/relatorios/export-button.tsx` | "use client" — Botão exportar Excel com SheetJS/xlsx |
| `components/relatorios/report-filters.tsx` | "use client" — Barra de filtros reutilizável (período, status, tipo, busca) |
| `components/relatorios/reservations-tab.tsx` | Tabela de reservas + contagem + export |
| `components/relatorios/financial-tab.tsx` | Tabela de fechamentos + total receita + badges de status + export |
| `components/relatorios/consumption-tab.tsx` | Tabela de consumo por reserva + export |
| `components/relatorios/waste-tab.tsx` | Tabela de desperdícios + total + export |
| `components/relatorios/stock-movements-tab.tsx` | Tabela de movimentações de estoque + badges de tipo + export |
| `components/relatorios/top-products-tab.tsx` | Tabela de produtos mais consumidos + export |
| `components/relatorios/low-stock-tab.tsx` | Tabela de estoque baixo + badge atenção + export |
| `components/relatorios/relatorios-page-client.tsx` | "use client" — Tabs (7 abas) + coordenação de filtros + PermissionGate por aba |

### Testes (1)

| Arquivo | Propósito |
|---------|-----------|
| `tests/lib/date-periods.test.ts` | Testes unitários para `getDateRange` (cada preset, custom, bordas) |

---

## Arquivos modificados pela Sprint 6

| Arquivo | Mudança |
|---------|---------|
| `package.json` | Adicionados `recharts` (^3.8.1) e `xlsx` às dependências |
| `package-lock.json` | Atualizado (+43 pacotes) |
| `lib/permissions.ts` | +6 funções: `canViewDashboard`, `canViewDashboardFinancial`, `canViewDashboardKitchen`, `canViewReports`, `canViewReportsFinancial`, `canViewReportsKitchen` |
| `app/(protected)/dashboard/page.tsx` | **Reescrita completa** — Server Component com `requireAuth()`, `searchParams` (período), queries paralelas, dados passados ao `DashboardPageClient` |
| `app/(protected)/relatorios/page.tsx` | **Reescrita completa** — Server Component com `requireAuth()`, `searchParams` (tab, período, filtros), 7 queries paralelas, dados passados ao `RelatoriosPageClient` |

---

## O que foi implementado

### Dashboard central (`/dashboard`)

- **9 cards** de indicadores com dados reais do banco:
  - Quartos disponíveis, Quartos ocupados, Reservas hoje, Check-ins hoje, Check-outs hoje
  - Receita no período (financeiro), Pagamentos pendentes (financeiro)
  - Desperdício no período (cozinha), Estoque baixo (cozinha)
- **4 gráficos Recharts:**
  - Receita por dia (BarChart) — query `$queryRaw` com `DATE_TRUNC`
  - Ocupação por status (PieChart) — `prisma.room.groupBy`
  - Desperdício por categoria (BarChart) — `$queryRaw` com JOIN StockMovement→Product→ProductCategory
  - Top 10 produtos consumidos (BarChart horizontal) — `prisma.reservationConsumption.groupBy`
- **Filtro de período** via URL searchParams: hoje, últimos 7 dias, mês atual, mês anterior, personalizado (com DatePicker)
- **PermissionGate** — cards financeiros visíveis só para ADMIN/GERENCIA/FINANCEIRO, cards cozinha visíveis só para ADMIN/GERENCIA/COZINHA
- Seção "Próximas entregas" e "Status do sistema" mantidas (atualizadas para Sprint 6)

### Relatórios (`/relatorios`)

- **7 abas** com navegação via @base-ui/react Tabs:
  1. **Reservas** — tabela com hóspede, quarto, datas, diária, status (ReservationStatusBadge), total calculado. Filtros: período + status. Export Excel.
  2. **Fechamentos** — tabela com hóspede, quarto, período, diárias, consumo, total final, status pagamento (badge), método. Filtros: período + paymentStatus. Resumo: total receita. Export Excel. *(visível só p/ FINANCEIRO)*
  3. **Consumo por Reserva** — tabela com hóspede, produto, descrição, qtd, preço unit, total. Filtros: período + busca hóspede. Export Excel.
  4. **Desperdícios** — tabela com produto, categoria, qtd, custo, motivo, data, responsável. Resumo: total desperdício + unidades. Export Excel. *(visível só p/ COZINHA)*
  5. **Movimentações de Estoque** — tabela com produto, tipo (badge colorido por tipo), qtd, custo, data, responsável. Filtros: período + tipo. Export Excel. *(visível só p/ COZINHA)*
  6. **Produtos Mais Consumidos** — tabela top N com produto, categoria, qtd total, custo total. Filtro: período. Export Excel. *(visível só p/ COZINHA)*
  7. **Estoque Baixo** — tabela com produto, categoria, estoque atual (destaque vermelho), estoque mínimo, unidade. Sem filtro de data (sempre atual). Badge "Atenção". Export Excel. *(visível só p/ COZINHA)*

### Permissões

| Role | Dashboard | Dashboard Financial | Dashboard Kitchen | Reports | Reports Financial | Reports Kitchen |
|------|-----------|-------------------|-------------------|---------|-------------------|-----------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GERENCIA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SECRETARIA | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| FINANCEIRO | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| COZINHA | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |

### Queries e performance

- Todas as queries em `lib/queries/` com `import "server-only"`
- Dashboard: 9 queries paralelas via `Promise.all` no Server Component
- Relatórios: 7 queries paralelas (uma por aba) — fetch completo no carregamento inicial para troca instantânea de abas
- `$queryRaw` usado apenas para agregações com `DATE_TRUNC` (não suportado nativamente pelo Prisma)
- Índices existentes aproveitados: `StockMovement(type, createdAt)`, `FinancialClosing(paymentStatus)`, `Reservation(status)`, `ReservationConsumption(productId)`

### Arquitetura

Segue o padrão já estabelecido em `/quartos/page.tsx`:
```
URL searchParams → Server Component (Prisma queries) → Client Component wrapper → Componentes filhos
```
- Server Components para data fetching (prisma direto, sem API layer)
- Client Components apenas onde APIs de browser são necessárias (Recharts SVG, SheetJS download, interação de filtros/tabs)
- Período e tab via URL searchParams — sobrevive a refresh, URLs compartilháveis
- Todos os estados vazios tratados com "0", "R$ 0,00" ou `EmptyMessage` — nunca "—"

---

## Pendências

### 1. TypeScript — erros de tipo em formatters Recharts

O type-check do Next.js reporta erros nos callbacks `formatter` do `Tooltip` e `label` do `Pie` em 2-3 chart components. A compilação (Turbopack) passa, mas o `tsc` integrado falha.

**Causa:** Recharts 3.x tem tipos restritivos para `formatter` (`ValueType | undefined` em vez de `number`, `NameType | undefined` em vez de `string`).

**Solução:** Remover anotações explícitas de tipo nos callbacks, deixando inferência automática. O linter já aplicou correções automáticas em alguns arquivos (`consumption-chart.tsx`, `occupancy-chart.tsx`). Verificar e replicar nos restantes (`revenue-chart.tsx`, `waste-chart.tsx`).

### 2. Build preso

Havia um processo `next build` zumbi impedindo rebuilds. Foi limpo com `Remove-Item .next -Recurse -Force`. O próximo build deve rodar limpo.

### 3. Testes não executados

- `tests/lib/date-periods.test.ts` — criado, não rodado
- Testes existentes de outras sprints — não verificados após mudanças

### 4. Quality gate não rodado

- `npm run quality:preflight` — não executado

---

## Ações recomendadas

```powershell
cd hotel-fazenda-system

# 1. Limpar build anterior se necessário
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue

# 2. Build e correção de tipos
npm run build
# Se falhar no type-check, corrigir anotações de tipo nos formatters Recharts:
# - components/dashboard/revenue-chart.tsx (formatter, labelFormatter)
# - components/dashboard/waste-chart.tsx (formatter)

# 3. Testes
npm test

# 4. Quality gate
npm run quality:preflight
```

---

## Dependências entre sprints

A Sprint 6 **LÊ** dados das Sprints 3, 4 e 5 (que estão sendo codadas em paralelo). Como o schema Prisma já está completo com todos os 11 modelos, as queries da Sprint 6 funcionam independentemente — se as tabelas estiverem vazias, todos os cards/gráficos/tabelas mostram "0" ou `EmptyMessage`.

**Nenhuma migração de banco foi necessária na Sprint 6.** Apenas leitura de dados existentes.

---

## Arquivos que NÃO foram tocados (sem conflito com outras sprints)

- `app/(protected)/reservas/` — Sprint 3
- `app/(protected)/cozinha/` — Sprint 4
- `app/(protected)/estoque/` — Sprint 4
- `app/(protected)/financeiro/` — Sprint 5
- `app/(protected)/hospedes/` — Sprint 3
- `lib/actions/` — Sprints 3, 4, 5
- `lib/validations/` — Sprints 3, 4, 5
- `prisma/schema.prisma` — schema completo, sem alterações
- `components/layout/` — sem alterações
- `components/ui/` — sem alterações

O único arquivo compartilhado é `lib/permissions.ts`, que recebeu apenas **append** (6 funções adicionadas ao final, sem modificar funções existentes).
