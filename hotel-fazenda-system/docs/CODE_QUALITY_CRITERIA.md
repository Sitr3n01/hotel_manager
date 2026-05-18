# Critérios de Qualidade do Código

Este documento registra os critérios de revisão do orquestrador para manter o MVP pronto para evolução incremental, produção e apresentação ao cliente.

## Critérios obrigatórios

- O Quality Gate determinístico é a fonte de verdade: `npm run quality:preflight` precisa passar antes de qualquer entrega.
- Nenhuma mudança pode reduzir cobertura, aumentar duplicação, introduzir lint errors, enfraquecer o baseline ou esconder sinais de falha.
- Fluxos críticos precisam ser idempotentes, transacionais quando há escrita composta e explícitos sobre conflitos de negócio.
- Código de domínio deve falhar com mensagens compreensíveis em português, sem perda silenciosa de dados.
- Server Actions e Route Handlers devem validar entrada com Zod e repetir as permissões no servidor, mesmo quando a UI já filtra ações.
- Operações financeiras, estoque, reservas e sync devem preservar trilha de auditoria.
- Arquivos devem permanecer coesos: ideal abaixo de 500 linhas, funções abaixo de 80 linhas, complexidade baixa e responsabilidades separadas.

## Critérios de arquitetura

- Reusar padrões existentes do projeto antes de criar novas abstrações.
- Manter o Prisma concentrado em `lib/actions`, `lib/queries`, handlers server-side e helpers explicitamente server-only.
- Usar Server Components por padrão; marcar `"use client"` somente para estado, browser APIs, formulários e hooks.
- Não duplicar regra de negócio em componentes quando ela pode viver em validações, helpers de domínio ou actions.
- Em sync/offline, diferenciar erro transitório (`FAILED`) de regra de negócio (`CONFLICT`) e manter retries seguros por `idempotencyKey`.

## Critérios de organização

- Documentação ativa fica em `docs/`; histórico de sprints fica em `docs/sprints/`.
- Esqueletos, prompts e material de planejamento ficam em `.dev/`, preservados mas fora do caminho principal.
- Artefatos gerados por build, coverage, reports, logs e service worker compilado não entram no Git.
- A raiz deve mostrar uma estrutura limpa para cliente e GitHub: README, workflow ativo, subprojeto e materiais de desenvolvimento bem separados.

## Antes de considerar uma sprint concluída

Rodar, no mínimo:

```bash
npm run lint
npm run test:coverage:ci
npm run build
npm run quality:preflight
```

Para mudanças em módulo crítico, também rodar testes direcionados do módulo antes da suíte completa.
