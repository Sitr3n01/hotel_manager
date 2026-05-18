# Offline e Sincronização

> Documento técnico da arquitetura introduzida na Sprint 7.
> Público-alvo: dev mantendo o sistema, dev adicionando novas operações offline.

---

## Visão geral

```
                  ┌────────────────────────┐
                  │   Service Worker       │  Serwist
                  │   - cache de shell     │
                  │   - fallback offline   │
                  └────────────────────────┘
                            │
   ┌────────────────────────┴────────────────────────┐
   │              PWA Shell (Next 16 webpack)        │
   │                                                 │
   │   Dialog → enqueueOrCreateX(input, userId)      │
   │              │                                  │
   │              ├─ ONLINE  → server action direta  │
   │              │                                  │
   │              └─ OFFLINE → enqueue(IndexedDB)    │
   │                          dispatch 'sync:enqueued'│
   │                                                 │
   │   SyncProvider observa:                         │
   │   - useConnectivity → ficou online → runSync()  │
   │   - window.focus → runSync()                    │
   │   - sync:enqueued → runSync()                   │
   └─────────────────────────┬───────────────────────┘
                             │ POST /api/sync/batch
                             ▼
   ┌─────────────────────────────────────────────────┐
   │  app/api/sync/batch/route.ts                    │
   │   ├─ getCurrentUser() ou 401                    │
   │   ├─ batchRequestSchema.safeParse               │
   │   └─ para cada op:                              │
   │       dispatchOperation(op, user)               │
   │        ├─ findExistingOperation → idempotência  │
   │        ├─ handlers/<type>.ts:                   │
   │        │  ├─ permissão                          │
   │        │  ├─ validação Zod do payload           │
   │        │  ├─ guards (estoque, reserva)          │
   │        │  ├─ prisma.$transaction(applyMovement) │
   │        │  └─ insere SyncedOperation             │
   │        └─ logAudit(OFFLINE_SYNC_*)              │
   └─────────────────────────────────────────────────┘
```

---

## Ciclo de vida de uma operação

Status no IndexedDB:

```
PENDING ──► SYNCING ──► SYNCED   (sucesso)
                  ├──► CONFLICT  (regra de negócio)
                  └──► FAILED    (rede / 401 / 500)

FAILED/CONFLICT ──► (retry) ──► PENDING
```

1. **PENDING**: enfileirada, ainda não enviada.
2. **SYNCING**: enviada ao servidor, esperando resposta. `attempts += 1`.
3. **SYNCED**: aplicada no banco. Pode ser removida do IndexedDB (futuro: cleanup automático).
4. **FAILED**: erro transitório (rede, 5xx, 401). Volta a PENDING ao retry.
5. **CONFLICT**: rejeitada por regra (estoque, permissão, produto inativo, conflito de datas). Não é retentável automaticamente — exige correção pelo usuário.

---

## Idempotência

Cada operação enfileirada recebe um `localId` (UUID v4) que vira `idempotencyKey` ao chegar no servidor.

**Tabela `SyncedOperation`** registra toda tentativa (APPLIED/CONFLICT/FAILED) com `idempotencyKey UNIQUE`. Antes de processar, o dispatcher consulta:

```ts
const existing = await findExistingOperation(op.idempotencyKey);
if (existing) return mapExistingToResult(existing);
```

- APPLIED → `{ status: "ALREADY_APPLIED" }` (cliente marca SYNCED sem reaplicar).
- CONFLICT/FAILED → mesmo resultado original (cliente não retenta).

Adicionalmente, `StockMovement.idempotencyKey`, `ReservationConsumption.idempotencyKey` e `Reservation.idempotencyKey` têm UNIQUE constraint, impedindo duplicação física no caso raro de a `SyncedOperation` falhar mas a entidade ter sido criada.

---

## Como adicionar uma nova operação offline

1. **Schema Zod** em `lib/validations/sync-operation.ts`:
   ```ts
   const myOpSchema = z.object({
     ...baseOpFields,
     operationType: z.literal("MY_NEW_OP"),
     payload: myPayloadSchema, // do domínio existente
   });
   ```
   Adicionar ao `discriminatedUnion`.

2. **Handler server-side** em `lib/sync/server/handlers/my-new-op.ts`:
   - Checar `op.operationType` (early return FAILED se errado)
   - Checar permissão (`canDoX(user.role)` → CONFLICT)
   - `payloadSchema.safeParse` → FAILED se inválido
   - Tx Prisma: aplicar mudança + inserir `SyncedOperation`
   - `logAudit({ action: "OFFLINE_SYNC_APPLIED" })` fora da tx
   - Retornar `{ status: "APPLIED", idempotencyKey, entityId }`

3. **Dispatcher** em `lib/sync/server/dispatch.ts`:
   - Adicionar entry em `ENTITY_BY_TYPE`
   - Adicionar `case` no `switch`

4. **Wrapper client-side** em `lib/sync/queue-actions.ts`:
   ```ts
   export async function enqueueOrCreateX(input, userId): Promise<OfflineAwareResult> {
     if (await isOnline()) {
       const result = await xServerAction(input);
       return result.success ? { success: true } : { success: false, error: result.error };
     }
     await enqueue({ operationType: "MY_NEW_OP", payload: input, createdByUserId: userId });
     fireEnqueued();
     return { success: true, queued: true };
   }
   ```

5. **Dialog** importa `enqueueOrCreateX` em vez da server action.

6. **Rótulo pt-BR** em `lib/sync/format.ts`.

7. **Tipo `OperationType`** em `lib/sync/types.ts`.

---

## Convenções de cor por status

Reutiliza paleta semântica do sistema:

| Status | Tom |
|---|---|
| PENDING | warning (âmbar) |
| SYNCING | accent (azul) |
| SYNCED | success (verde) |
| FAILED | destructive (vermelho) |
| CONFLICT | destructive (vermelho intenso) |

---

## Permissões

A camada de sync **não introduz permissões novas**. Cada handler reusa `canX(user.role)` de `lib/permissions.ts`. Se o usuário perdeu a permissão entre enfileirar e sincronizar, o servidor retorna CONFLICT.

---

## Auditoria

| Audit Action | Quando |
|---|---|
| `OFFLINE_SYNC_APPLIED` | Operação aplicada com sucesso. `afterData` = entidade criada. |
| `OFFLINE_SYNC_CONFLICT` | Rejeitada por regra de negócio. `metadata.reason` = mensagem. |
| `OFFLINE_SYNC_FAILED` | Exceção não tratada. Não usar para 401 (cliente fica em FAILED localmente sem audit). |

Metadata sempre inclui: `operationType`, `idempotencyKey`.

---

## Debug

### Ver fila local
DevTools → Application → IndexedDB → `hotel-fazenda-offline` → `operations`.

### Ver histórico no servidor
Prisma Studio → `SyncedOperation` ou query:
```sql
SELECT * FROM "SyncedOperation"
WHERE "actorId" = '<uuid>'
ORDER BY "createdAt" DESC LIMIT 50;
```

### Forçar sync manual
Página `/sincronizacao` → botão "Sincronizar agora".

### Simular offline
Chrome DevTools → Network → Offline. O sistema detecta via `pingServer()` em até 30s.

### Reset da fila local
DevTools console:
```js
indexedDB.deleteDatabase("hotel-fazenda-offline");
location.reload();
```

---

## Limitações conhecidas

1. **Não há retry com backoff automatizado**: `runSync` é disparado por eventos (online, focus, enqueue). Operações FAILED ficam paradas até o usuário clicar "Tentar novamente" ou um evento natural disparar sync.
2. **Sem replicação de leitura offline**: o app carrega dados via SSR. Se offline e nunca visitou a página, a página fica indisponível (shell abre, conteúdo não).
3. **`SYNCED` no IndexedDB acumula**: sem TTL de limpeza. Sprint 8 pode adicionar.
4. **Lote máximo 50 operações**: por POST. Filas maiores precisam de múltiplos batches.
5. **Pré-reserva**: sempre enfileira (mesmo online) porque a validação de conflito exige consulta server-side e a UX é mais simples assim.

---

## Testes

```bash
# Todos os testes da Sprint 7
npx vitest run tests/lib/sync

# Cobertura específica
npx vitest run tests/lib/sync --coverage
```

`tests/lib/sync/queue.test.ts` cobre transições de estado e contagem.
`tests/lib/sync/sync-engine.test.ts` cobre o ciclo APPLIED / CONFLICT / FAILED / 401 com `fetch` mockado.
