# Security Review — v0.1.0-alpha

- Data: 2026-05-18
- Escopo: baseline completa do `hotel-fazenda-system` no commit `33d8940`
- Stack: Next.js 16 (App Router, Webpack), Supabase Auth, Prisma 6, Serwist PWA, single-tenant
- Metodologia: leitura completa de `app/`, `lib/`, `proxy.ts`, `next.config.ts`, dependências (`npm audit`), Zod schemas, RBAC e service worker

## Sumário executivo

Aplicação tem fundação de segurança sólida: dupla camada de auth (Supabase + Prisma `UserProfile`), 55 permission tags granulares com presets por role, audit log com `ACCESS_DENIED`, server-only imports nos pontos críticos, `.env.local` corretamente gitignored e nunca commitado. Encontrados **3 findings high (corrigidos inline)** e **1 finding high deferido** (CVE de dependência sem fix upstream). Os demais findings são medium/low e estão documentados abaixo.

A baseline está em condições aceitáveis para alpha público interno (1 fazenda), mas **3 ações fora do código são obrigatórias antes de exposição mais ampla**: rotação do `SUPABASE_SERVICE_ROLE_KEY`, substituição do `xlsx@0.18.5` por `exceljs`, e adoção de rate limiting em login/access-request/sync/export.

## Findings

### High

#### [F-1] `xlsx@0.18.5` — Prototype Pollution + ReDoS  ✅ fix aplicado

- CVSS 7.8 ([GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)) + CVSS 7.5 ([GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9))
- SheetJS Inc. removeu o pacote do npm registry — `npm audit fix` não resolve.
- **Fix aplicado** no Sprint de Hardening (ver `docs/sprints/sprint-security-hardening-report.md`): migração completa para [`exceljs@4.4.0`](https://www.npmjs.com/package/exceljs) em [app/api/export/fechamento/[id]/route.ts](../app/api/export/fechamento/%5Bid%5D/route.ts) e [components/relatorios/export-button.tsx](../components/relatorios/export-button.tsx). Dependência `xlsx` removida de `package.json`.

#### [F-2] Secrets reais em `.env.local` (em disco, não em git)  ⚠️ aberto

- Verificado: `.env.local` está em `.gitignore` (linha "env files") e nunca apareceu em `git log --all`. Sem leak no repo.
- Conteúdo do `.env.local` em disco contém: `SUPABASE_SERVICE_ROLE_KEY` (JWT válido até **2036**, ~70 anos), `DATABASE_URL` com senha em texto plano, `ADMIN_PASSWORD=League01.` (senha fraca/comum).
- **Recomendação imediata** (ação humana no console Supabase):
  1. Revogar service-role JWT atual e gerar nova com TTL reduzido (e.g. 12 meses).
  2. Trocar `ADMIN_PASSWORD` por valor aleatório ≥20 caracteres gerado por password manager.
  3. Trocar senha do Postgres role usado em `DATABASE_URL`.
  4. Atualizar `.env.local` local e qualquer ambiente de produção/staging.
  5. Adicionar item ao runbook: rotação trimestral de secrets.

#### [F-3] Service worker cacheava navegações autenticadas via `defaultCache`  ✅ fix inline

- `app/sw.ts` usava `runtimeCaching: defaultCache` (do `@serwist/next/worker`), que inclui NetworkFirst para navegações. **Risco**: usuário B vendo HTML em cache de usuário A no mesmo dispositivo, ou usuário voltando ao app após logout vendo dashboard cacheado.
- `next.config.ts` tinha `cacheOnNavigation: true` que reforçava o cache de navegação.
- **Fix aplicado** ([app/sw.ts](../app/sw.ts), [next.config.ts](../next.config.ts)):
  - Anexada regra `NetworkOnly` antes de `defaultCache` para qualquer URL same-origin sob `/api/*` ou requests com `request.mode === "navigate"`.
  - `cacheOnNavigation: false` em `next.config.ts`.
  - Precache do app shell preservado; assets estáticos (CSS/JS/imagens/fontes) continuam cacheados via defaults.

#### [F-4] `requestAccess()` engolia erros do service-role client  ✅ fix inline

- `lib/actions/auth.ts:189-194` capturava `catch { return null }` em `resolveAccessAuthUserId`, mascarando falhas da chamada `admin.auth.admin.createUser`. Este é o **único path público** que toca o service-role key, então qualquer abuso (rate-limit hits, conflitos, throttling) ficava invisível.
- **Fix aplicado**: adicionar `logAudit({ action: "ACCESS_REQUEST_CREATE_FAILED" })` com a mensagem de erro real antes de retornar null. Mensagem ao cliente permanece genérica (não vaza detalhes).
- **Follow-up**: rate limit em `requestAccess()` (ver F-7).

### Medium

#### [F-5] `normalizeRedirect` não cobria todos os padrões de open-redirect  ✅ fix inline

- `lib/actions/auth.ts:229` aceitava `redirectTo` que começasse com `/` desde que não fosse `//`. Não cobria `/\evil.com` (alguns parsers normalizam `\` para `/`).
- **Fix aplicado**: regex `/^\/[^/\\]/` exige primeiro caractere `/` seguido de algo que NÃO seja `/` nem `\`.

#### [F-6] `assertPermission` lançava sem logar `ACCESS_DENIED`  ✅ fix inline

- `lib/auth/require-permission.ts:37-51` era inconsistente com `requirePermission` (que loga via `logDeniedAccess`). Sem callers ainda, mas é fix defensivo.
- **Fix aplicado**: `assertPermission` e `assertAnyPermission` agora são `async` e logam antes do throw. Sem callers, sem breakage.

#### [F-7] `/api/export/fechamento/[id]` só auditava sucesso  ✅ fix inline

- Tentativas de export que retornavam 403 (sem permission) ou 404 (closing inexistente) não geravam audit log.
- **Fix aplicado** ([route.ts](../app/api/export/fechamento/[id]/route.ts)): adicionar `EXPORT_DENIED` (403) e `EXPORT_NOT_FOUND` (404). Ambos preservam o `id` requisitado para detecção de scanning.

#### [F-8] `SyncedOperation.idempotencyKey` global permitia replay cross-user  ✅ fix inline

- `findExistingOperation(idempotencyKey)` em `lib/sync/server/idempotency.ts` retornava o row de outro usuário se a chave colidisse — vazando o `entityId` do outro usuário via `mapExistingToResult`.
- Probabilidade de colisão acidental é astronomicamente baixa (UUID v4, 122 bits), mas um atacante autenticado que descobrisse a chave de outro usuário poderia confirmar e extrair o entityId.
- **Fix aplicado**:
  - `findExistingOperation(key, actorId)` agora usa `findFirst` filtrando por actor.
  - Novo `hasForeignOperation(key, actorId)` detecta colisão sem expor `entityId`.
  - Novo `foreignKeyConflictResult(key)` retorna `CONFLICT` genérico.
  - `dispatchOperation` checa próprio → estrangeiro → handler nessa ordem.
  - P2002 fallback em `recordSyncRejection` também usa lookup scoped + retorna conflict genérico se foreign.

#### [F-9] Ausência de security headers  ✅ fix inline

- `next.config.ts` minimal — sem CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Fix aplicado**: header set global em `headers()`. CSP com `unsafe-inline/unsafe-eval` para JS/CSS (Next 16 ainda emite scripts inline; Tailwind injeta styles). Tightening com nonces em sprint dedicada.

#### [F-10] `postcss <8.5.10` transitivo de Next — XSS via `</style>`  ⚠️ aberto

- [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93). `fixAvailable` requer downgrade de Next.js para 9.3.3 — não aceitável.
- **Recomendação**: monitorar release notes do Next 16; quando upstream publicar patch transitivo, rodar `npm audit fix`. Tracking only.

#### [F-11] Sem rate limiting em endpoints públicos/de autenticação  ✅ fix aplicado (parcial — ver limitações)

- `login()`, `requestAccess()`, `/api/export/fechamento/[id]` agora possuem rate limit Token Bucket in-memory ([lib/rate-limit.ts](../lib/rate-limit.ts)). `/api/sync/batch` permanece sem rate limit (ver follow-ups).
- **Limites aplicados**:
  - `login`: 5 surtos por IP, refill 1 token / 10s
  - `requestAccess`: 3 surtos por IP, refill 1 token / 60s
  - `/api/export/fechamento/[id]`: 3 surtos por IP, refill 1 token / 20s (com `EXPORT_DENIED` em auditoria via 429)
- **Limitações conhecidas** (a endurecer em PR-C dedicado):
  - **IP spoofing**: `x-forwarded-for` é aceito sem trust-proxy check; um atacante pode rotacionar o header. Mitigar usando `x-vercel-forwarded-for` / `cf-connecting-ip` conforme deploy.
  - **Memory leak**: o `Map` de buckets não tem TTL/eviction.
  - **Multi-instância**: in-memory é por processo; em serverless cada lambda tem seu Map. Migrar para Upstash/Vercel KV antes de escalar.

### Low

#### [F-12] `requestedRole` aceito do cliente em `requestAccess`  ℹ️ informativo

- Originalmente classificado como High; verificação de `accessRequestSchema` em `lib/validations/auth.ts:13-15` mostra enum restrito a `["GERENCIA", "SECRETARIA", "COZINHA", "FINANCEIRO"]` — **sem ADMIN**, sem privilege escalation possível via solicitação.
- Permanece o risco menor de poluir fila de aprovação com pedidos legítimos em massa (coberto por F-11).

#### [F-13] `requestAccess` revela existência de e-mail  ✅ fix aplicado

- Mensagens diferentes para "já existe conta ativa" vs criação permitiam user enumeration.
- **Fix aplicado** ([lib/actions/auth.ts:203-213](../lib/actions/auth.ts)): `resolveExistingAccessRequest()` agora retorna resposta uniforme redirecionando para `/aguardando-aprovacao` em ambos os casos (conta ativa OU pendente), neutralizando enumeração via lista de e-mails.

#### [F-14] `/api/health` passa pelo middleware completo

- `proxy.ts` aplica middleware → `updateSession` → `supabase.auth.getUser()` mesmo para `/api/health` (que está em `PUBLIC_PATHS`). Perf, não security.
- **Recomendação**: short-circuit antes do `getUser()` para paths em `PUBLIC_PATHS`.

#### [F-15] `logAudit` em `recordSyncRejection` usa `idempotencyKey` como `entityId`

- `lib/sync/server/idempotency.ts:60` grava `entityId: args.op.idempotencyKey` quando rejeição não cria row de domínio. Mistura conceitos, dificulta joins futuros.
- **Recomendação**: usar `entityId: null` e mover idempotencyKey para `metadata`.

#### [F-16] `hasPermission` aceita fallback por role legado

- `lib/auth/permissions.ts:233-241` resolve permissões via `role` preset se `permissions` estiver vazio. Aceitável em transição; depreciar após RLS rollout.

## Fixes aplicados nesta revisão

| ID | Arquivo | Mudança |
|----|---------|---------|
| F-3 | [app/sw.ts](../app/sw.ts), [next.config.ts](../next.config.ts) | `NetworkOnly` para `/api/*` e navegações + `cacheOnNavigation: false` |
| F-4 | [lib/actions/auth.ts:189-204](../lib/actions/auth.ts) | Logar falhas de `createAdminClient` ao invés de engolir |
| F-5 | [lib/actions/auth.ts:229-237](../lib/actions/auth.ts) | Regex strict em `normalizeRedirect` |
| F-6 | [lib/auth/require-permission.ts:37-58](../lib/auth/require-permission.ts) | `assertPermission`/`assertAnyPermission` agora `async` e logam denial |
| F-7 | [app/api/export/fechamento/[id]/route.ts](../app/api/export/fechamento/[id]/route.ts) | Audit em 403/404/429 |
| F-8 | [lib/sync/server/idempotency.ts](../lib/sync/server/idempotency.ts), [lib/sync/server/dispatch.ts](../lib/sync/server/dispatch.ts) | Lookup scoped por actorId + conflict genérico para foreign collision |
| F-9 | [next.config.ts](../next.config.ts) | Headers HSTS, CSP, XFO, XCTO, Referrer-Policy, Permissions-Policy |
| F-1 | [app/api/export/fechamento/[id]/route.ts](../app/api/export/fechamento/[id]/route.ts), [components/relatorios/export-button.tsx](../components/relatorios/export-button.tsx), [package.json](../package.json) | Migração `xlsx@0.18.5` → `exceljs@4.4.0` (Sprint de Hardening) |
| F-11 | [lib/rate-limit.ts](../lib/rate-limit.ts), [lib/actions/auth.ts](../lib/actions/auth.ts), [app/api/export/fechamento/[id]/route.ts](../app/api/export/fechamento/[id]/route.ts) | Rate limit Token Bucket em login (5/10s), requestAccess (3/60s), export (3/20s) — in-memory, ver limitações em F-11 |
| F-13 | [lib/actions/auth.ts:203-213](../lib/actions/auth.ts) | Resposta uniforme em `requestAccess` para neutralizar enumeração de e-mails |
| RLS  | [prisma/manual/03_rls_policies.sql](../prisma/manual/03_rls_policies.sql) | Runbook RLS para 14 tabelas operacionais com policies validadas contra `PERMISSION_TAGS` |

## Recomendações de follow-up (não aplicadas)

| ID | Prioridade | Ação |
|----|-----------|------|
| F-2 | P0 | Rotacionar `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, senha do Postgres |
| F-11+ | P1 | Endurecer rate limiter: trust-proxy (Vercel/CF headers), eviction lazy de buckets stale, separar `/api/sync/batch` |
| RLS-exec | P1 | Executar `prisma/manual/03_rls_policies.sql` em Supabase staging → validar com smoke por role → promover para prod |
| F-9 | P2 | CSP com nonces — remover `unsafe-inline`/`unsafe-eval` quando Next permitir |
| F-10 | P3 | Monitorar `npm audit` para patch transitivo do postcss via Next |
| @types/exceljs | P3 | Remover devDep legada (`@types/exceljs@0.5.3`); o `exceljs@4.x` já empacota tipos próprios |

## Apêndice

### A. npm audit — resumo
- Total: 3 vulnerabilidades (1 high, 2 moderate)
- High: `xlsx@0.18.5` (Prototype Pollution + ReDoS) — sem fix no registry
- Moderate: `postcss<8.5.10` transitivo de `next` (XSS) + `next` transitivo
- Saída completa disponível via `npm audit --json`

### B. Confirmações de gitignore / git history
- `.env.local` em `.gitignore` (linha `.env.local`)
- `git ls-files | grep env` retorna apenas `.env.example`, `lib/supabase/env.ts`, `prisma/migrations/.../migration.sql`, `tests/lib/supabase-env.test.ts` — nenhum arquivo de credenciais real
- `git log --all -- "**/.env*"` retorna apenas commits modificando `.env.example`

### C. Itens NÃO encontrados como problema

- SQL injection: Prisma parametriza queries automaticamente; nenhum uso de `prisma.$queryRaw` com input não validado
- XSS via injeção direta de HTML no React (`__dangerously` prefixos) — nenhuma ocorrência em `app/` ou `components/`
- Path traversal — todos os params dinâmicos passam por Prisma com UUID validation
- Service role exposto ao cliente — `lib/supabase/admin.ts` usa `import "server-only"`; usado apenas em `lib/actions/auth.ts` (server action) e `lib/actions/users.ts`
- Permissions handler bypass: cada handler de sync (`stock-purchase`, `internal-consumption`, `waste`, `reservation-consumption`, `pre-reservation`) checa permissão própria via `canRegisterX(user)`

### D. Validação dos fixes

Ver seção "Verificação end-to-end (test plan)" no plano de execução em `~/.claude/plans/`.
