# Hotel Fazenda - Sistema de Gestão

Sistema web para substituir o controle em papel do hotel fazenda. Cobre reservas, hóspedes, cozinha, estoque, consumo, desperdícios, financeiro, relatórios e operação offline/PWA. Construído em **Next.js + TypeScript + Supabase + Prisma**, governado por um **Quality Gate** determinístico desde o primeiro commit.

## Status atual

**Sprint 8 implementada**. O MVP possui módulos operacionais, PWA/offline da Sprint 7 e agora login com aprovação, perfis base, tags granulares, gestão administrativa de usuários/permissões e auditoria.

## Stack

- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind CSS 4 + shadcn/ui
- Supabase (Auth + PostgreSQL)
- Prisma 6 (schema versionado, Client tipado)
- `@supabase/ssr` para sessão entre Server/Client
- Serwist + IndexedDB (`idb`) para PWA/offline sync
- Zod + React Hook Form
- Vitest + @vitest/coverage-v8
- Quality Gate determinístico com política ratchet

## Pré-requisitos

- Node.js >= 18.18 (CI usa 22)
- npm (não pnpm/yarn; o gate usa `package-lock.json` e `npm ci`)
- Projeto Supabase configurado

## Setup rápido

```bash
git clone <repo>
cd mestre_darmas/hotel-fazenda-system
npm install
cp .env.example .env.local
npx prisma generate
npm run db:migrate
npm run db:seed
npm run dev
```

Setup detalhado: [`docs/SETUP.md`](docs/SETUP.md).

## Comandos principais

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor local em `http://localhost:3000` |
| `npm run build` | Build de produção com webpack, incluindo Serwist |
| `npm run start` | Roda o build |
| `npm run lint` | ESLint |
| `npm run test:run` | Vitest em uma passada |
| `npm run test:coverage:ci` | Testes com coverage para o gate |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:seed` | Dados iniciais |
| `npm run quality:preflight` | Audit, lint, build, coverage, duplicação, complexidade e gate |

Antes de cada push ou entrega, rode:

```bash
npm run quality:preflight
```

## Estrutura

```text
app/                    App Router, páginas protegidas e rotas API
components/             UI por módulo, layout, sync e componentes compartilhados
lib/actions/            Server Actions por módulo
lib/queries/            Consultas server-side para dashboard e relatórios
lib/sync/               IndexedDB, sync engine e handlers server-side
lib/validations/        Schemas Zod
prisma/                 Schema, migrations, SQL manual e seed
quality/                Config e baseline do Quality Gate
scripts/quality/        Motor determinístico do gate
tests/                  Suíte Vitest
docs/                   Documentação técnica ativa
docs/sprints/           Histórico das sprints
```

## Documentação

- [`docs/SETUP.md`](docs/SETUP.md) - Supabase, `.env`, migrations e seed
- [`docs/DATABASE.md`](docs/DATABASE.md) - modelos e relações
- [`docs/AUTH_AND_PERMISSIONS.md`](docs/AUTH_AND_PERMISSIONS.md) - login, aprovação, tags e Admin inicial
- [`docs/RLS.md`](docs/RLS.md) - base RLS planejada sobre as tags da Sprint 8
- [`docs/QUALITY_GATE.md`](docs/QUALITY_GATE.md) - como rodar e interpretar o gate
- [`docs/OFFLINE_AND_SYNC.md`](docs/OFFLINE_AND_SYNC.md) - arquitetura PWA/offline da Sprint 7
- [`docs/CODE_QUALITY_CRITERIA.md`](docs/CODE_QUALITY_CRITERIA.md) - critérios do orquestrador
- [`docs/sprints/`](docs/sprints/) - relatórios, handoffs e notas históricas

## Observações de produção

- O build gera `public/sw.js` e workers hashados. Eles são artefatos e não devem ser commitados.
- `quality/baseline.json` é versionado, mas não deve ser atualizado para esconder regressões.
- A validação PWA real ainda precisa de smoke test manual em Chrome DevTools/Lighthouse após `npm run build && npm run start`.
