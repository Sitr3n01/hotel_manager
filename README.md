# Mestre D'Armas — Sistema de Gestão Hoteleira

> Português · [English](README.en.md)

Plataforma web para gestão de hotel-fazenda. Substitui o controle em papel por um sistema integrado de reservas, hóspedes, cozinha, estoque, financeiro, relatórios e operação offline.

**Versão atual:** `v0.1.0-alpha` — em desenvolvimento ativo.

## Stack Técnica

| Camada            | Tecnologia                                                          |
| ----------------- | ------------------------------------------------------------------- |
| Framework         | Next.js 16 (App Router) · React 19 · TypeScript                     |
| UI                | Tailwind CSS 4 · shadcn/ui                                          |
| Banco de Dados    | PostgreSQL gerenciado via Supabase                                  |
| ORM               | Prisma 6                                                            |
| Autenticação      | Supabase Auth com aprovação manual e permissões granulares por tag  |
| PWA / Offline     | Serwist · IndexedDB com fila de sincronização idempotente           |
| Validação         | Zod · React Hook Form                                               |
| Testes            | Vitest · @vitest/coverage-v8                                        |
| Qualidade         | Quality Gate determinístico (lint, build, coverage, complexidade)   |

## Módulos

- **Reservas** — calendário, timeline, status, edição e cancelamento
- **Hóspedes** — cadastro, documentação e histórico
- **Cozinha** — consumo por reserva, consumo interno e controle de desperdício
- **Estoque** — produtos, categorias, entradas em lote, ajustes e alertas
- **Financeiro** — fechamentos, conferência e exportação de relatórios
- **Dashboard e Relatórios** — ocupação, receita, consumo e baixos estoques
- **Sincronização** — operação offline com fila e resolução de conflitos
- **Permissões** — login com aprovação, tags por usuário e auditoria

## Estrutura

Monorepo. O produto está em [`hotel-fazenda-system/`](hotel-fazenda-system/):

```
hotel-fazenda-system/
├── app/           Rotas (App Router) e APIs
├── components/    UI por módulo
├── lib/           Server Actions, queries, sync e validações
├── prisma/        Schema e migrations
├── tests/         Suíte Vitest
└── docs/          Documentação técnica
```

## Setup

Pré-requisitos: Node.js 18.18+, npm e projeto Supabase configurado.

```bash
cd hotel-fazenda-system
npm install
cp .env.example .env.local       # preencher credenciais
npx prisma generate
npm run db:migrate
npm run db:seed
npm run dev
```

Detalhes em [`hotel-fazenda-system/docs/SETUP.md`](hotel-fazenda-system/docs/SETUP.md).

## Comandos

| Comando                       | Descrição                            |
| ----------------------------- | ------------------------------------ |
| `npm run dev`                 | Servidor local em `localhost:3000`   |
| `npm run build`               | Build de produção                    |
| `npm run test:run`            | Suíte de testes Vitest               |
| `npm run quality:preflight`   | Quality Gate completo antes do push  |

## Status do Alpha

`v0.1.0-alpha` cobre os módulos principais com PWA/offline funcional. Pendem refinamentos de UX, otimização de performance e validação em ambiente real antes do beta.

## Licença

Privado — todos os direitos reservados.
