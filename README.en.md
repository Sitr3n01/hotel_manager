# Mestre D'Armas — Hotel Management System

> [Português](README.md) · English

Web platform for ranch-hotel management. Replaces paper workflows with an integrated system covering reservations, guests, kitchen, inventory, finance, reporting and offline operation.

**Current version:** `v0.1.0-alpha` — under active development.

## Tech Stack

| Layer             | Technology                                                            |
| ----------------- | --------------------------------------------------------------------- |
| Framework         | Next.js 16 (App Router) · React 19 · TypeScript                       |
| UI                | Tailwind CSS 4 · shadcn/ui                                            |
| Database          | PostgreSQL hosted on Supabase                                         |
| ORM               | Prisma 6                                                              |
| Authentication    | Supabase Auth with manual approval and tag-based granular permissions |
| PWA / Offline     | Serwist · IndexedDB with idempotent sync queue                        |
| Validation        | Zod · React Hook Form                                                 |
| Testing           | Vitest · @vitest/coverage-v8                                          |
| Quality           | Deterministic Quality Gate (lint, build, coverage, complexity)        |

## Modules

- **Reservations** — calendar, timeline, status, edit and cancel flows
- **Guests** — profile, documents and history
- **Kitchen** — per-reservation consumption, internal use and waste tracking
- **Inventory** — products, categories, batch intake, adjustments and alerts
- **Finance** — closings, reconciliation and report export
- **Dashboard & Reports** — occupancy, revenue, consumption and low-stock
- **Sync** — offline operation with queue and conflict resolution
- **Permissions** — login with approval, per-user tags and audit log

## Structure

Monorepo. The product lives in [`hotel-fazenda-system/`](hotel-fazenda-system/):

```
hotel-fazenda-system/
├── app/           Routes (App Router) and APIs
├── components/    Module-scoped UI
├── lib/           Server Actions, queries, sync and validations
├── prisma/        Schema and migrations
├── tests/         Vitest suite
└── docs/          Technical documentation
```

## Setup

Prerequisites: Node.js 18.18+, npm and a configured Supabase project.

```bash
cd hotel-fazenda-system
npm install
cp .env.example .env.local       # fill in credentials
npx prisma generate
npm run db:migrate
npm run db:seed
npm run dev
```

See [`hotel-fazenda-system/docs/SETUP.md`](hotel-fazenda-system/docs/SETUP.md) for full details.

## Commands

| Command                       | Description                          |
| ----------------------------- | ------------------------------------ |
| `npm run dev`                 | Local server at `localhost:3000`     |
| `npm run build`               | Production build                     |
| `npm run test:run`            | Vitest test suite                    |
| `npm run quality:preflight`   | Full Quality Gate before pushing     |

## Alpha Status

`v0.1.0-alpha` ships the core modules with a working PWA/offline layer. UX polish, performance tuning and real-environment validation remain before beta.

## License

Private — all rights reserved.
