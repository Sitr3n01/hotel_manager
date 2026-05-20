# Relatório de Implementação: Hardening de Segurança (Sprint de Segurança)

**Data:** 20 de Maio de 2026  
**Status da Implementação:** Concluída & Validada  
**Requisitos de Qualidade:** Aprovados pelo Quality Gate (Ratchet Mode)

---

## 1. Visão Geral
Este relatório consolida a implementação das correções de segurança propostas no **Plano de Hardening de Segurança** para preparar o **Hotel Fazenda System** para o ambiente de produção. O trabalho focou em mitigar de ponta a ponta vulnerabilidades críticas nas camadas de dependência, controle de acesso, banco de dados e APIs públicas, mantendo a conformidade absoluta com o rigoroso **Quality Gate** do projeto.

---

## 2. Detalhamento das Melhorias de Hardening

### 2.1 Remoção do SheetJS e Migração Completa para `exceljs`
Para sanar a vulnerabilidade crítica de **Prototype Pollution** (CVE-2022-36270) e **ReDoS** presente no pacote `xlsx@0.18.5`, a dependência foi totalmente expurgada e substituída pela biblioteca segura e performática `exceljs@4.4.0` em dois pontos:

1. **Camada de Servidor (API Route):**
   * **Arquivo:** [route.ts](file:///c:/Users/zegil/Documents/GitHub/mestre_darmas/hotel-fazenda-system/app/api/export/fechamento/%5Bid%5D/route.ts)
   * **Ação:** Reescrevemos a função `buildWorkbook` de forma assíncrona para instanciar a estrutura do `ExcelJS.Workbook`, populando as planilhas `Fechamento` e `Consumos` com seus cabeçalhos e metadados. Retornamos o buffer binário resultante sem expor segredos nem alterar a experiência do usuário.

2. **Camada de Cliente (React Component):**
   * **Arquivo:** [export-button.tsx](file:///c:/Users/zegil/Documents/GitHub/mestre_darmas/hotel-fazenda-system/components/relatorios/export-button.tsx)
   * **Ação:** Removemos o import global do `xlsx` e reestruturamos a função `handleExport` para instanciar um `ExcelJS.Workbook` no próprio navegador, gerar o array buffer assincronamente e forçar o download via `Blob` e URL temporária com segurança e sem dependências legadas.

### 2.2 Blindagem contra User Enumeration (Enumeração de Usuários)
* **Arquivo:** [auth.ts](file:///c:/Users/zegil/Documents/GitHub/mestre_darmas/hotel-fazenda-system/lib/actions/auth.ts)
* **Ação:** O fluxo público de solicitação de acesso (`requestAccess`) antes expunha mensagens detalhadas quando um e-mail já possuía uma conta ativa ("*Já existe uma conta ativa para este e-mail*"). 
* **Mitigação:** Alteramos a função interna `resolveExistingAccessRequest()` para que, caso o e-mail inserido já possua uma conta ativa ou pendente, a API retorne uma resposta de sucesso uniforme redirecionando o usuário para `/aguardando-aprovacao`. Isso impede que atacantes realizem varreduras automatizadas utilizando listas de e-mails vazadas para descobrir quais colaboradores estão cadastrados no Hotel.

### 2.3 Integração de Rate Limiting In-Memory (Token Bucket)
Para proteger os recursos computacionais do servidor e neutralizar ataques automatizados de força bruta e DoS (Denial of Service), integramos a biblioteca de controle de taxa Token Bucket a três pontos estratégicos do sistema:

1. **Server Action `login`:**
   * **Limite:** 5 requisições de surto por IP, com taxa de recarga de 1 token a cada 10 segundos.
   * **Efeito:** Mitiga ataques de dicionário e força bruta contra credenciais de colaboradores.
2. **Server Action `requestAccess`:**
   * **Limite:** 3 requisições de surto por IP, com taxa de recarga de 1 token a cada ~60 segundos (0.017 tokens/s).
   * **Efeito:** Bloqueia tentativas maliciosas de spam de contas pendentes e esgotamento do limite administrativo de criação de usuários no Supabase.
3. **API Route `/api/export/fechamento/[id]`:**
   * **Limite:** 3 requisições de surto por IP, com taxa de recarga de 1 token a cada 20 segundos.
   * **Efeito:** Protege a CPU de chamadas massivas concorrentes para geração de relatórios pesados.

*Caso os limites sejam extrapolados, a aplicação emite a mensagem de feedback `"Muitas tentativas..."` (nas Actions) ou retorna status HTTP `429 Too Many Requests` com respectivo registro imutável em `logAudit()`.*

### 2.4 Runbook SQL de Row Level Security (RLS) no Banco de Dados
* **Arquivo:** [03_rls_policies.sql](file:///c:/Users/zegil/Documents/GitHub/mestre_darmas/hotel-fazenda-system/prisma/manual/03_rls_policies.sql)
* **Ação:** Criamos o script de hardening oficial para execução direta e centralizada no banco Postgres do Supabase. O script realiza:
  1. Criação das funções SQL estáveis e seguras (`public.current_user_profile_id()` e `public.has_permission()`) para validar sessões e ler tags de permissões ativas diretamente na tabela `UserPermissionTag`.
  2. Habilitação do Row Level Security (RLS) em todas as **14 tabelas operacionais** do banco.
  3. Configuração de políticas de leitura e gravação segregadas pelas permissões granulares vigentes (ex: `RESERVATIONS_READ`, `PRODUCTS_WRITE`, `USERS_READ`, etc.).
  4. Configuração de **Políticas Append-Only para `AuditLog`**, habilitando somente `SELECT` para administradores e `INSERT` para usuários aprovados, com proibição estrita de comandos `UPDATE` e `DELETE` no banco para resguardar a imutabilidade forense do log.

---

## 3. Validação Técnica e Confiabilidade

### 3.1 Suite de Testes Automatizados
Escrevemos e executamos uma suíte detalhada de testes unitários para validar a lógica matemática, regeneração temporal de tokens e clampa de buckets do novo rate limiter.
* **Arquivo de Teste:** [rate-limit.test.ts](file:///c:/Users/zegil/Documents/GitHub/mestre_darmas/hotel-fazenda-system/tests/lib/rate-limit.test.ts)
* **Status:** Todos os 4 novos testes unitários passaram.
* **Suíte Completa:** Executamos `npm run test:run` cobrindo todas as regras de negócio do projeto:
  * **Total de Testes:** **320/320 Passando com Sucesso!** (100% de sucesso).

### 3.2 Validação do Quality Gate (Preflight Local)
Rodamos localmente a suíte completa de preflight (`npm run quality:preflight`), obtendo o parecer **Pronto para GitHub** com conformidade total:
* **Validação de Configurações:** Aprovada.
* **Relatório de Auditoria de Vulnerabilidades:** Sem vulnerabilidades conhecidas ou dependências inseguras ativas.
* **Linting:** 0 erros e 0 warnings.
* **Cobertura de Código (Coverage):** Mantida dentro da linha base (ratchet mode).
* **Duplicações de Código (`jscpd`):** Sem novas duplicações introduzidas.
* **Complexidade Ciclomática (ESLint Complexity):** Todas as funções estão sob o limite rígido (complexidade < 10).
* **Deterministic Quality Gate check:** **PASSED** (0 blocking errors, 0 warnings).

---

## 4. Conclusão
O Hotel Fazenda System foi blindado com sucesso nas principais superfícies de ataque mapeadas. A remoção de SheetJS desarmou o vetor de Prototype Pollution, a opacidade introduzida na autenticação neutralizou a enumeração de contas, o rate limit em nível de aplicação protegeu a CPU de ataques DoS e o runbook RLS sedimentou a segurança no banco de dados.

*O sistema atinge agora o status **Production-Ready** em termos de segurança hoteleira de alta resiliência.*

---

## 5. Postmortem — Correção do runbook RLS (2026-05-20)

Em revisão pós-sprint identificamos que o `03_rls_policies.sql` original referenciava 9 permission keys **inexistentes** no registro canônico `PERMISSION_TAGS` ([lib/auth/permissions.ts](../../lib/auth/permissions.ts)). Se executado contra o Postgres, bloquearia toda escrita nas 8 tabelas operacionais correspondentes (nenhum usuário consegue ter permission que não existe).

**Mapeamento aplicado em PR-A:**

| Tabela | Key inválida (original) | Keys corretas (corrigido) |
|---|---|---|
| `RoomType` | `ROOMS_WRITE` | `ROOM_TYPES_MANAGE` |
| `Room` (INSERT) | `ROOMS_WRITE` | `ROOMS_CREATE` |
| `Room` (UPDATE) | `ROOMS_WRITE` | `ROOMS_UPDATE` OR `ROOMS_CHANGE_STATUS` OR `ROOMS_DEACTIVATE` |
| `Guest` (DELETE) | `GUESTS_DELETE` | omitida (sistema usa `GUESTS_DEACTIVATE`, soft-delete) |
| `Reservation` (DELETE) | `RESERVATIONS_DELETE` | omitida (cancelamento é UPDATE de status via `RESERVATIONS_CANCEL`) |
| `Product` / `ProductCategory` | `PRODUCTS_WRITE` | `STOCK_CREATE_PRODUCT` OR `STOCK_UPDATE_PRODUCT` OR `STOCK_DEACTIVATE_PRODUCT` |
| `StockMovement` | `STOCK_WRITE` | `STOCK_CREATE_ENTRY` OR `STOCK_CREATE_ADJUSTMENT` OR `KITCHEN_CREATE_INTERNAL_CONSUMPTION` OR `KITCHEN_CREATE_WASTE` |
| `ReservationConsumption` (SELECT) | `CONSUMPTIONS_READ` | `KITCHEN_READ` OR `KITCHEN_VIEW_RECENT_MOVEMENTS` OR `FINANCIAL_READ` |
| `ReservationConsumption` (INSERT) | `CONSUMPTIONS_CREATE` | `KITCHEN_CREATE_CONSUMPTION` |
| `ReservationConsumption` (UPDATE) | `CONSUMPTIONS_UPDATE` | omitida (reversões via SyncedOperation `CONSUMPTION_REVERSE`) |
| `FinancialClosing` (INSERT) | `FINANCIAL_WRITE` | `FINANCIAL_CREATE_CLOSING` |
| `FinancialClosing` (UPDATE) | `FINANCIAL_WRITE` | `FINANCIAL_UPDATE_PAYMENT_STATUS` OR `FINANCIAL_APPLY_DISCOUNT` OR `FINANCIAL_APPLY_EXTRA` OR `FINANCIAL_REOPEN_CLOSING` |
| `AuditLog` (SELECT) | `USERS_READ` | `AUDIT_LOGS_READ` (chave dedicada existente) |

**Melhoria adicional**: `UserProfile` UPDATE expandido para aceitar todas as 6 keys que mutam o row (`USERS_UPDATE_TAGS` + `USERS_APPROVE` + `USERS_REJECT` + `USERS_UPDATE_ROLE` + `USERS_DEACTIVATE` + `USERS_REACTIVATE`).

**Validação estática**: script Node cruzando `has_permission('...')` do SQL contra `tag("...")` do TS confirmou 43/43 keys válidas, zero discrepâncias.

**Status do runbook**: aplicado no projeto Supabase `sqntohariaepeagollzw` em 2026-05-20 via `mcp__supabase__apply_migration` (migrations `rls_policies_initial` + 2 hardening). 32 policies ativas em 14 tabelas; dados existentes intactos (1 UserProfile, 61 PermissionTags, 61 grants, 11 Rooms, 15 AuditLogs).

**Lição aprendida**: o Quality Gate é necessário mas não suficiente — SQL não é cross-validado contra o registro de permissões TS. Hook futuro: pre-commit que valide `has_permission('...')` ↔ `PERMISSION_TAGS`.

### Hardening descoberto durante aplicação (seção 14 do SQL)

Ao aplicar o runbook, o advisor de segurança Supabase flagrou que as helper functions `current_user_profile_id()` e `has_permission(text)` ficavam expostas via `/rest/v1/rpc/*` para `anon` e `authenticated` por serem `SECURITY DEFINER`.

Análise do risco:

- **anon**: `auth.uid()` é `null` → funções retornam `null`/`false`. Zero leak, mas superfície desnecessária.
- **authenticated**: retorna apenas escopo próprio (próprio profile id; próprias permissions). Sem leak — informação já disponível pelas tabelas via RLS.

**Hardening aplicado** (seção 14 adicionada ao `03_rls_policies.sql`):

```sql
REVOKE EXECUTE ON FUNCTION public.current_user_profile_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_profile_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated, service_role;
```

Detalhe importante: `REVOKE FROM PUBLIC` por si só não remove os grants explícitos que Supabase atribui automaticamente — `anon` precisa ser revogado nominalmente. `authenticated` mantém EXECUTE porque é o role que as policies usam para chamar as funções.

**Diferença em relação ao padrão `20260517163732_revoke_internal_security_definer_execute`**: aquele migration revoga de `public, anon, authenticated` para `handle_new_auth_user` e `rls_auto_enable` porque essas funções rodam em contexto de trigger (onde EXECUTE do role não é checado). Nossas funções são chamadas dentro de policies como `authenticated`, então revogá-las desse role quebraria todas as verificações de permissão.

**Advisors remanescentes** (todos aceitáveis):

- `_prisma_migrations` RLS sem policy — intencional, tabela interna do Prisma não deve ser REST-accessível
- `authenticated_security_definer_function_executable` em ambas as helpers — aceito (sem leak material)
- `auth_leaked_password_protection` — pré-existente, ativar no dashboard Supabase
