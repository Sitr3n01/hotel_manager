# Setup — Hotel Fazenda

Passo-a-passo para colocar o sistema rodando do zero em uma máquina nova.

## 1. Pré-requisitos

- Node.js >= 18.18 (recomendado: 22 LTS)
- npm (não usar pnpm ou yarn — o Quality Gate exige `package-lock.json`)
- Git
- Conta em [supabase.com](https://supabase.com/dashboard) (plano free é suficiente para desenvolvimento)

## 2. Clonar e instalar

```bash
git clone https://github.com/Sitr3n01/hotel_manager.git
cd hotel_manager/hotel-fazenda-system
npm install
```

Confirme que o `package-lock.json` está versionado — ele é necessário para `npm ci` no CI.

## 3. Criar projeto no Supabase

1. Em [supabase.com/dashboard](https://supabase.com/dashboard), clique em **New project**.
2. Escolha a organização, defina nome (ex.: `hotel-fazenda-dev`), região (recomendado: `sa-east-1` — São Paulo) e senha do banco. **Guarde a senha** — não dá para recuperar.
3. Aguarde o projeto provisionar (~2 min).

## 4. Copiar chaves para `.env.local`

```bash
cp .env.example .env.local
```

No painel do Supabase:

### 4.1 Project Settings → API

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ A `service_role` **nunca** pode aparecer em código client. Ela só é usada em scripts server-side (`prisma/seed.ts`).

### 4.2 Project Settings → Database

Clique em **Connection string**:

- Modo **Transaction** (porta 6543, com `pgbouncer=true&connection_limit=1`) → `DATABASE_URL`
- Modo **Session** (porta 5432, sem pooler) → `DIRECT_URL`

Substitua `[YOUR-PASSWORD]` na URL pela senha do banco que você definiu.

### 4.3 Authentication → Providers → Email

Em desenvolvimento, **desative** "Confirm email" para o login funcionar imediatamente. Reative antes de produção.

### 4.4 Credenciais do admin inicial (para o seed)

No `.env.local`:

```env
ADMIN_EMAIL=admin@hotelfazenda.local
ADMIN_PASSWORD=<senha forte>
```

## 5. Aplicar o schema do banco

```bash
npx prisma generate
npm run db:migrate
```

A primeira vez vai criar `prisma/migrations/<timestamp>_init/` e aplicar todas as tabelas.

## 6. Aplicar o trigger SQL manual

O Prisma não pode tocar no schema `auth.*` do Supabase. Por isso, o trigger que sincroniza `auth.users` → `public.UserProfile` precisa ser aplicado manualmente.

1. Abra o **SQL Editor** no painel do Supabase.
2. Cole o conteúdo de [`prisma/manual/01_user_profile_trigger.sql`](../prisma/manual/01_user_profile_trigger.sql).
3. Execute. Deve criar a função `handle_new_auth_user` e o trigger `on_auth_user_created`.

Verificação:

```sql
select tgname from pg_trigger where tgname = 'on_auth_user_created';
```

Deve retornar uma linha.

> ⚠️ Toda vez que você rodar `npm run db:reset`, **repita o passo 6** — o reset apaga objetos do schema `public`, mas o Supabase às vezes também derruba o trigger.

## 6b. Aplicar SQL constraint de reservas (Sprint 3)

A regra "uma reserva por quarto por período" tem validação na aplicação (`lib/availability.ts` + Server Actions), mas existe também uma **rede de segurança no banco** contra race conditions. Ela usa `EXCLUDE USING gist` com `daterange` e a extensão `btree_gist`.

1. No SQL Editor do Supabase, cole o conteúdo de [`prisma/manual/02_reservation_overlap_exclusion.sql`](../prisma/manual/02_reservation_overlap_exclusion.sql).
2. Execute. O script é idempotente — pode ser rodado várias vezes sem problema.

Verificação:

```sql
select conname from pg_constraint where conname = 'reservation_no_overlap_per_room';
```

Deve retornar uma linha. Para testar que funciona, tente criar via SQL duas reservas no mesmo `roomId` com `daterange` sobreposto e ambas com `status IN ('PRE_RESERVED','CONFIRMED','CHECKED_IN')`. A segunda deve falhar com `conflicting key value violates exclusion constraint`.

> ⚠️ Toda vez que você rodar `npm run db:reset`, **repita também este passo** — o reset apaga a constraint junto com a tabela.

## 7. Criar o admin e dados de exemplo

```bash
npm run db:seed
```

Saída esperada:

```
[seed] Ensured 61 permission tags.
[seed] Synced admin admin@hotelfazenda.local in Supabase Auth and UserProfile.
[seed] Created 2 categories, 5 products, 4 room types, 10 rooms.
```

Se o inventário de exemplo já existir, o seed não duplica categorias/produtos e ainda garante o catálogo completo de quartos da Sprint 2. O seed também cria as tags oficiais e concede todas ao Admin inicial.

Confirme no painel Supabase:
- **Authentication → Users**: aparece o admin.
- **Database → Tables → UserProfile**: existe a linha com `role = ADMIN`, `status = APPROVED` e `isActive = true`.
- **Database → Tables → UserPermissionTag**: o Admin possui tags ativas.

## 8. Rodar o app

```bash
npm run dev
```

Abra http://localhost:3000:

- Sem login → redireciona para `/login`
- Logando com as credenciais do admin → acessa `/dashboard`
- Sidebar mostra apenas áreas liberadas pelas tags do usuário.

## 9. Validar o Quality Gate

```bash
npm run quality:validate    # config + scripts ok
npm run quality:preflight   # roda producers + check
```

Na primeira vez, o baseline ainda tem `null` em todas as métricas — o gate emite warnings sem falhar. Para semear o baseline:

```bash
git switch main
npm run quality:baseline
git add quality/baseline.json
git commit -m "chore(quality): seed initial baseline"
```

Mais detalhes em [QUALITY_GATE.md](QUALITY_GATE.md).

## Problemas comuns

### `prisma migrate dev` reclama de conexão

Verifique se `DATABASE_URL` está usando porta **6543** com `pgbouncer=true&connection_limit=1` e `DIRECT_URL` está usando **5432** sem pooler. Migrations exigem conexão direta.

### Login dá "E-mail ou senha inválidos" para credenciais corretas

Confirme que "Confirm email" está desativado em **Authentication → Providers → Email** (em dev). Se estiver ativado, o usuário criado pelo seed não fica "confirmado" — exceto pelo flag `email_confirm: true` na chamada Admin, que deve resolver. Se ainda assim falhar, recriar manualmente no painel.

### "PrismaClient is unable to be run in the browser"

Algum import de `lib/prisma.ts` chegou ao client. Verifique que `getCurrentUser` é chamado apenas em Server Components / Route Handlers / Server Actions, nunca em `"use client"`.

## 10. Instalar plugins Claude Code + Codex (Quality Gate)

Para ter os slash commands `/quality-gate:check`, `/quality-gate:explain`, `/quality-gate:fix` e `/quality-gate:baseline` disponíveis em qualquer projeto:

### Claude Code

```bash
# Uma vez por máquina (qualquer pasta)
claude plugin marketplace add "C:/Users/zegil/Documents/GitHub/quality_review" --scope user
claude plugin install quality-gate@quality-gate --scope user
```

Reinicie o Claude Code ou rode `/reload-plugins` para aplicar.

> O caminho `C:/Users/zegil/Documents/GitHub/quality_review` é o checkout local do template. Se você clonou o quality_review em outro lugar, ajuste.

### Codex

```bash
# De dentro do projeto (hotel-fazenda-system/)
curl -fsSL https://raw.githubusercontent.com/Sitr3n01/quality_review/main/scripts/install-codex.sh | bash -- --full
```

## 11. Testes manuais críticos

Após configurar o Supabase, validar:

### Auth
- [ ] Acessar `http://localhost:3000` sem login → redireciona para `/login`
- [ ] Login com `admin@hotelfazenda.local` + senha → acessa `/dashboard`
- [ ] Acessar `/dashboard` em aba anônima → bloqueado, vai para `/login`
- [ ] Clicar "Sair" no header → volta para `/login` com campos vazios

### Layout
- [ ] Sidebar mostra apenas os itens liberados pelas tags do usuário
- [ ] Item ativo (dashboard) destacado com cor de accent
- [ ] Header mostra nome, role badge e avatar com iniciais
- [ ] Mobile (<768px): sidebar some, header mantém nome

### Páginas placeholder
- [ ] Cada link da sidebar carrega página com `<ModulePlaceholder>` correto
- [ ] `/dashboard` tem 5 cards de métrica + 2 cards de status
- [ ] `/configuracoes` mostra nome, email, role, status e atalhos administrativos permitidos
- [ ] `/configuracoes/usuarios` permite aprovar, rejeitar, bloquear, reativar e editar tags como Admin

### API
- [ ] `curl http://localhost:3000/api/health` → `{"status":"ok"}`

### Quality Gate
- [ ] `npm run quality:validate` → `passed (0 errors, 0 warnings)`
- [ ] `npm run quality:preflight` → `READY_FOR_GITHUB=true`
- [ ] `npm run quality:baseline` na `main` → sobrescreve `quality/baseline.json`

### Segurança
- [ ] `SUPABASE_SERVICE_ROLE_KEY` NÃO aparece em nenhum arquivo em `app/` ou `components/`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` é a única chave Supabase em código client

### Quality Gate: "package-lock.json is required"

Não use pnpm/yarn. Apague `pnpm-lock.yaml`/`yarn.lock` e rode `npm install` para gerar `package-lock.json`.
