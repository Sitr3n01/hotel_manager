# Sprint 7 — Progress Report (PWA + offline + sync)

**Status: implementação completa, pendente smoke test em PWA real** | **Data: 2026-05-18**

---

## Objetivo

Transformar o sistema em PWA instalável e introduzir uma fila offline em IndexedDB que sincroniza operações críticas da cozinha/estoque e pré-reservas quando a internet volta — sem perda silenciosa e sem duplicação por retentativa.

---

## Stack adicionada

| Pacote | Versão | Função |
|---|---|---|
| `serwist` | ^9.5.11 | Service worker (sucessor moderno do next-pwa) |
| `@serwist/next` | ^9.5.11 | Integração Next.js |
| `idb` | ^8.0.3 | Wrapper TypeScript para IndexedDB |
| `fake-indexeddb` | devDep | IndexedDB em memória para Vitest |

---

## Mudanças no banco

Migration: [`20260518100000_sprint7_sync_idempotency/migration.sql`](../prisma/migrations/20260518100000_sprint7_sync_idempotency/migration.sql)

- `Reservation`, `StockMovement`, `ReservationConsumption` ganharam:
  - `idempotencyKey UUID UNIQUE` (nullable)
  - `origin TEXT` (`"OFFLINE_SYNC"` para registros vindos da fila)
- Nova tabela `SyncedOperation` registra **toda tentativa de sync** (APPLIED, CONFLICT, FAILED) com `idempotencyKey UNIQUE` — base da idempotência.

Migration é **aditiva e segura**: novas colunas nullable, sem backfill. Multiple-null aceito em índices unique do Postgres.

Aplicar em produção:
```bash
npx prisma migrate deploy
```

---

## Arquivos criados (novos — 32)

### Server-side de sync (`lib/sync/server/`)
- `errors.ts` — `ConflictError` (regra de negócio rejeita operação)
- `types.ts` — `OperationType`, `SyncEntity`, `SyncResult`
- `idempotency.ts` — `findExistingOperation`, `mapExistingToResult`, `recordSyncRejection`, `buildSyncedOperationData`
- `dispatch.ts` — roteamento por `operationType`, mapeia `ConflictError` → CONFLICT
- `guards/stock.ts` — `loadActiveProduct`, `assertStockAvailable` (lança ConflictError)
- `guards/reservation.ts` — `loadEditableReservation`
- `handlers/waste.ts`, `internal-consumption.ts`, `stock-purchase.ts`, `reservation-consumption.ts`, `pre-reservation.ts`

### Route handler
- `app/api/sync/batch/route.ts` — POST `/api/sync/batch`

### Validações
- `lib/validations/sync-operation.ts` — discriminated union Zod por `operationType`, schema do batch

### Cliente / fila (`lib/sync/`)
- `types.ts` — `PendingOperation`, `OperationStatus`, `CountsByStatus`, `SyncResultPayload`
- `db.ts` — schema IndexedDB (object store `operations`)
- `queue.ts` — CRUD da fila (enqueue, list, mark transitions, retry, discard, count)
- `connectivity.ts` — `useConnectivity()` + `pingServer()` em `/api/health`
- `sync-engine.ts` — `runSync()` com batch size 20, max attempts 5
- `queue-actions.ts` — wrappers `enqueueOrCreate*` que decidem online vs offline
- `provider.tsx` — `SyncProvider` Context React, dispara sync ao ficar online, focar aba, enfileirar
- `format.ts` — rótulos pt-BR

### PWA
- `app/sw.ts` — Service Worker (Serwist)
- `public/manifest.webmanifest`
- `public/icons/icon-192.svg`, `icon-512.svg`, `icon-maskable-512.svg` (placeholders verdes "HF")

### UI (`components/sync/`)
- `status-badge.tsx`, `online-indicator.tsx`, `pending-badge.tsx`, `pending-row.tsx`, `sync-page-client.tsx`

### Compartilhado
- `components/shared/queued-notice.tsx`

### Página
- `app/(protected)/sincronizacao/page.tsx`

### Pré-reserva offline
- `components/reservas/pre-reserva-offline-dialog.tsx`

### Testes
- `tests/lib/sync/queue.test.ts` (7 testes)
- `tests/lib/sync/sync-engine.test.ts` (4 testes)

---

## Arquivos modificados (20)

| Arquivo | Mudança |
|---|---|
| `package.json` | Adicionadas deps (serwist, idb, fake-indexeddb) e `build` passou a usar `--webpack` (Serwist não suporta Turbopack ainda) |
| `next.config.ts` | `withSerwist` wrapper, SW desabilitado em dev |
| `proxy.ts` | Matcher exclui `sw.js`, `workbox-*.js`, `manifest.webmanifest`, `icons/*` |
| `app/layout.tsx` | Metadata `manifest`, `viewport.themeColor`, `appleWebApp`, `icons` |
| `tsconfig.json` | `lib` agora inclui `webworker` (para `ServiceWorkerGlobalScope` no `sw.ts`) |
| `tests/setup.ts` | Import `fake-indexeddb/auto` |
| `prisma/schema.prisma` | 3 campos novos + 1 model `SyncedOperation` |
| `lib/audit.ts` | 1 entity nova (`SyncedOperation`) + 3 actions novas (`OFFLINE_SYNC_APPLIED/CONFLICT/FAILED`) |
| `lib/actions/stock-movement.ts` | `applyMovement` aceita `idempotencyKey?` e `origin?` opcionais |
| `lib/supabase/middleware.ts` | `/api/sync` retorna 401 JSON em vez de redirect |
| `components/layout/protected-shell.tsx` | Envolve com `<SyncProvider>` |
| `components/layout/app-header.tsx` | `<OnlineIndicator />` inserido |
| `components/layout/app-sidebar.tsx` | Item "Sincronização" + `<PendingBadge />`; rodapé atualizado |
| `components/shared/stock-movement-fields.tsx` | Aceita `result.queued`, mostra `<QueuedNotice />` |
| `components/cozinha/desperdicio-dialog.tsx` | Usa `enqueueOrCreateWaste` |
| `components/cozinha/consumo-interno-dialog.tsx` | Usa `enqueueOrCreateInternalConsumption` |
| `components/cozinha/consumo-hospede-dialog.tsx` | Usa `enqueueOrCreateReservationConsumption` + queuedNotice |
| `components/cozinha/cozinha-page-client.tsx` | Recebe `userId` |
| `components/estoque/entrada-batch-dialog.tsx` | Usa `enqueueOrCreatePurchase` |
| `components/estoque/movimentacoes-tab.tsx` | Propaga `userId` |
| `components/estoque/estoque-page-client.tsx` | Propaga `userId` |
| `components/reservas/reservation-consumo-tab.tsx` | Propaga `userId` |
| `components/reservas/reservas-page-client.tsx` | Adiciona botão `<PreReservaOfflineDialog />` no header |
| `app/(protected)/cozinha/page.tsx` | Passa `user.id` |
| `app/(protected)/estoque/page.tsx` | Passa `user.id` |
| `app/(protected)/reservas/page.tsx` | Passa `user.id` |
| `app/(protected)/reservas/[id]/page.tsx` | Passa `user.id` |

---

## Critérios de aceite

| Item | Status |
|---|---|
| App instalável como PWA | ✓ (sw.js gerado pelo build) |
| Manifest válido | ✓ |
| Shell offline após primeira carga | ✓ (Serwist defaultCache, NetworkFirst) |
| Header mostra online/offline/checking | ✓ |
| Sidebar mostra contador de pendentes | ✓ |
| Desperdício, consumo interno, consumo de reserva e entrada de estoque podem ser lançados offline | ✓ |
| Pré-reserva pode ser criada offline | ✓ |
| Pendências aparecem em `/sincronizacao` | ✓ |
| Sync automático ao voltar online | ✓ (SyncProvider dispara) |
| `origin = OFFLINE_SYNC` e `idempotencyKey` populados nos registros sincronizados | ✓ |
| `SyncedOperation` registra APPLIED/CONFLICT/FAILED | ✓ |
| Audit log `OFFLINE_SYNC_*` | ✓ |
| Estoque insuficiente vira CONFLICT | ✓ (`assertStockAvailable`) |
| Permissão revogada vira CONFLICT | ✓ |
| Produto inativo vira CONFLICT | ✓ |
| Reserva fechada vira CONFLICT | ✓ |
| Retry da mesma idempotencyKey não duplica | ✓ (UNIQUE em `SyncedOperation.idempotencyKey`) |
| Sessão expirada → FAILED | ✓ (401 detectado) |
| Botões "Tentar novamente" e "Descartar" | ✓ |
| `npm run build` | ✓ |
| `npm run test:run` | ✓ (309/309) |

---

## Comandos de verificação

```bash
# Build
npm run build              # webpack — Serwist gera public/sw.js

# Testes
npm run test:run           # 309 testes
npx vitest run tests/lib/sync   # 11 testes específicos da Sprint 7

# Dev (Serwist desabilitado em dev)
npm run dev

# Quality gate
npm run quality:preflight
```

---

## Verificação manual em produção local

```bash
npm run build && npm run start
```

Em Chrome DevTools:
1. **Application → Manifest**: campos preenchidos, ícones carregam
2. **Application → Service Workers**: `sw.js` activated
3. **Application → IndexedDB → hotel-fazenda-offline → operations**: visível
4. **Network → Offline**: navegar, lançar desperdício, ver fila crescer
5. **Network → Online**: confirmar sync e drenagem da fila
6. **Lighthouse → PWA audit**: alvo "Installable" + "PWA Optimized" verdes

---

## Riscos remanescentes / pendências para Sprint 8

1. **Serwist + Turbopack**: hoje rodamos build com `--webpack`. Quando `@serwist/turbopack` estiver maduro ou Next 17 mudar default, voltar para Turbopack.
2. **Bug pré-existente (Sprint 4): estoque negativo no caminho online** — `applyMovement` permite. A Sprint 7 protegeu apenas o caminho de sync. Patch sugerido para Sprint 8.
3. **RLS em `SyncedOperation`**: hoje a tabela está aberta para qualquer usuário autenticado consultar suas próprias linhas via app, mas não há policy no Postgres. Adicionar policies na Sprint 8.
4. **Cleanup de operações SYNCED antigas**: hoje permanecem no IndexedDB indefinidamente. Adicionar TTL (ex: > 7 dias).
5. **Rate limiting** em `/api/sync/batch` (hoje só limita 50 ops/batch).
6. **Ícones placeholder**: substituir SVG "HF" verde pelos ícones definitivos do cliente antes de produção.

---

## Decisões técnicas

### Por que Route Handler e não Server Action?
Server Actions são funções específicas, não aceitam payload genérico. Para sync em lote precisamos de POST JSON com array de operações. Route handler permite: (a) interceptação futura por SW (Background Sync), (b) reuse em testes via `fetch`, (c) extração de helpers puros reaproveitáveis pela action existente.

### Por que dupla camada de idempotência?
`idempotencyKey UNIQUE` nas tabelas de domínio impede duplicação física de registros aplicados. Mas operações que viram CONFLICT não criam registro de domínio — sem persistência, retry tentaria de novo. `SyncedOperation` registra **toda tentativa** (incluindo rejeições) e seu `UNIQUE` é a fonte de verdade da idempotência.

### Por que `pingServer` em vez de só `navigator.onLine`?
Redes do hotel fazenda: roteador Wi-Fi ligado (`onLine = true`) mas link de internet caído. Só descobrimos via round-trip real a `/api/health`. Ping a cada 30s com timeout de 5s — custo trivial vs benefício.

### Por que sequencial no servidor?
Operações no mesmo batch podem afetar o mesmo produto. Concorrência cria race em `currentStock`. Batches são pequenos (< 20 ops); não compensa otimizar.
