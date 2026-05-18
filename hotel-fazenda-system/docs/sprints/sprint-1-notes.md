# Sprint 1 — Notas técnicas e pendências

## Decisões tomadas

### Stack

- **Next.js 16** (App Router) com React 19. Não é a versão coberta na maioria dos tutoriais (ainda em transição do 15 → 16). Foco em padrões estáveis: rotas, layouts, Server Components, route groups `(auth)` e `(protected)`.
- **TypeScript** estrito. `next-env.d.ts` mantido como `.gitignore`d.
- **Tailwind CSS 4** + **shadcn/ui** (preset `base-nova`, base color `slate`).
- **Supabase** para Auth + PostgreSQL gerenciado. RLS planejada mas não implementada — entra na Sprint 8.
- **Prisma 6** (não 7). O Prisma 7 mudou drasticamente (`url` saiu do schema e foi para `prisma.config.ts`, novo padrão de adapter). Decisão: ficar em 6 por estabilidade até 7 amadurecer.
- **`@supabase/ssr`** com cookies API `getAll`/`setAll` (padrão atual).
- **Vitest** + `@vitest/coverage-v8` para testes. `jsdom` como ambiente. Coverage exclui `lib/supabase/**`, `lib/prisma.ts`, `lib/auth/**` (camadas que dependem de runtime Supabase/Prisma e não rendem teste unit limpo).

### Sincronização auth ↔ profile

`UserProfile.authUserId` aponta para `auth.users.id` (UUID) **sem FK formal** — schemas diferentes. A integridade é mantida pelo trigger `on_auth_user_created` em [`prisma/manual/01_user_profile_trigger.sql`](../prisma/manual/01_user_profile_trigger.sql), aplicado manualmente após cada `migrate dev`/`migrate reset`.

### Quality Gate

- Instalado via `install-into.sh` do template em `C:/Users/zegil/Documents/GitHub/quality_review`.
- Adaptamos `quality/quality-gate.config.cjs` para Next.js: `files.include` agora cobre `app/**`, `components/**`, `lib/**`, `prisma/**`, `tests/**`, `middleware.ts`.
- Adaptamos `.jscpd.json` para `typescript`, `tsx`, `javascript`, `jsx`.
- `eslint.config.mjs` mergeia `eslint-config-next/{core-web-vitals,typescript}` com regras de complexidade (`complexity: 10`, `max-depth: 4`, `max-lines-per-function: 80`).
- Modo legacy-friendly: ratchet on, minimums opt-in off.
- Baseline ainda **não foi semeado** — passo manual a fazer depois do primeiro `quality:preflight` limpo na `main`.

### npm vs pnpm

Escolhemos npm (apesar de pnpm ser mais moderno) porque o Quality Gate exige `package-lock.json` e usa `npm ci` no workflow. Adaptar o gate para pnpm sairia do caminho "drop-in" e exigiria fork de scripts internos.

### Estrutura de pastas

- Subpasta `hotel-fazenda-system/` dentro de `mestre_darmas/`, junto com o markdown de planejamento na raiz. Isso permite que outros agentes/sistemas vivam no mesmo repositório no futuro sem conflito.
- `app/(auth)/login` e `app/(protected)/*` via route groups. O guard real é o `middleware.ts`, que redireciona antes de qualquer Server Component renderizar.

## Pendências para Sprint 2

### Produto / UX

- [ ] **Quartos UI**: tabela vs. grid de cards? Confirmar com cliente.
- [ ] **Status de quarto**: `MAINTENANCE` tem subtipos (preventiva, corretiva, profunda)? Ou um único status basta?
- [ ] **`RoomType`**: confirmar campos obrigatórios vs opcionais (descrição, cama extra, etc.)
- [ ] **`Room.number`**: único globalmente ou por andar/região? Modelagem atual é único global.
- [ ] **Capacidade**: validar se `Reservation.adults + children > Room.roomType.maxCapacity` bloqueia a criação ou só avisa.

### Técnica

- [ ] **Primeiras RLS policies reais**: começar com `UserProfile` (cada um vê o próprio) e `RoomType` (R+W para ADMIN/GERENCIA, R para o resto).
- [ ] **Validar baseline**: rodar `quality:preflight` na main e semear o baseline antes do primeiro PR feature.
- [ ] **Avaliar habilitar `coverage.minimums.severity: "blocking"`** quando coverage estabilizar > 60%.
- [ ] **Avaliar habilitar `duplication.maximum.severity: "blocking"`** quando duplicação ficar consistentemente < 3%.
- [ ] **CLAUDE.md/AGENTS.md do projeto**: o create-next-app gerou um aviso sobre Next 16 ter breaking changes. Considerar consolidar essas instruções com as do Quality Gate.

### Operacional

- [ ] **GitHub repo**: ainda local. Criar repositório remoto, configurar branch protection em `main` para exigir o workflow Quality Gate.
- [ ] **Vercel**: criar projeto, configurar env vars de produção (com um **Supabase project separado** para produção, não o de dev).
- [ ] **Plugin Claude Code**: o usuário precisa rodar manualmente `claude plugin marketplace add "C:/Users/zegil/Documents/GitHub/quality_review" --scope user` + `claude plugin install quality-gate@quality-gate --scope user` para ter os slash commands disponíveis.

## Riscos conhecidos

- **Next 16 é novo**: APIs podem ainda mudar em patches menores; manter um olho nas release notes.
- **Prisma 6 → 7**: vamos precisar migrar em algum momento (Prisma 6 ainda suportado, mas Prisma 7 é o futuro). Mais doloroso quanto mais código tivermos. Considerar migrar entre Sprint 5 e 6.
- **Trigger SQL não versionado pelo Prisma**: se alguém esquecer de reaplicar após `migrate reset`, o sistema parece funcionar mas usuários novos ficam sem `UserProfile`. Documentado em `docs/SETUP.md`, mas é um pé de cabra.
- **Service role key**: usada no `prisma/seed.ts`. Garantir que não vaza para client. ESLint não detecta isso automaticamente — revisar manualmente em PR.

## Critérios de aceite (consolidados)

- [x] Projeto roda localmente (`npm run dev`)
- [x] TypeScript sem erros (`npm run build` passa)
- [x] Lint sem problemas críticos (`npm run lint` passa)
- [x] Vitest roda (`npm run test:run` — 6 testes passando)
- [x] Coverage produzido (`coverage/coverage-summary.json` gerado)
- [ ] Login funciona (depende de Supabase configurado pelo usuário)
- [ ] Logout funciona (idem)
- [ ] Rotas internas protegidas (lógica implementada — validar quando Supabase estiver up)
- [x] Estrutura de perfis (5 roles no enum)
- [x] Prisma schema com 11 modelos
- [ ] Migration aplicada (depende de Supabase configurado)
- [x] `.env.example` existe
- [x] README + docs/ explicam instalação
- [x] Service role key não exposta em client
- [x] Páginas placeholder existem (9 rotas)
- [x] Layout base consistente
- [x] Quality Gate instalado e configurado
- [ ] Baseline do Quality Gate semeado (passo final, na `main`)
> Atualizacao de hardening: o guard raiz foi migrado de `middleware.ts` para `proxy.ts` (convencao Next.js 16), `npm run build` passou a fazer parte do preflight, e o baseline inicial deve ser semeado depois desse estado verde.
> Baseline inicial semeado na `main`: `quality/baseline.json` agora fixa coverage 2.77/2.70/3.57/0.00, duplicacao 0.00%, lint 0/0 e audit 0 vulnerabilidades.
