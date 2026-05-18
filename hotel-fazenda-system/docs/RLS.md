# RLS

## Status

Sprint 8 aplica a segurança efetiva no servidor, via Prisma e guards de permissão. RLS completa nas tabelas operacionais fica preparada e documentada para uma etapa dedicada, porque Prisma usa conexão direta e não herda automaticamente policies por JWT.

## Proteção ativa agora

- Supabase Auth valida a sessão.
- `UserProfile.status` e `isActive` bloqueiam pendentes, rejeitados, bloqueados e inativos.
- Tags ativas em `UserPermissionTag` autorizam módulos, páginas e server actions.
- Admin altera permissões somente por server actions protegidas.
- `SUPABASE_SERVICE_ROLE_KEY` aparece apenas em código server-only.

## Base recomendada para RLS

Criar funções SQL estáveis para centralizar a checagem:

```sql
create or replace function public.current_user_profile_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id
  from public."UserProfile"
  where "authUserId" = auth.uid()
    and status = 'APPROVED'
    and "isActive" = true
  limit 1;
$$;

create or replace function public.has_permission(permission_key text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."UserPermissionTag" upt
    join public."PermissionTag" pt on pt.id = upt."permissionTagId"
    where upt."userProfileId" = public.current_user_profile_id()
      and upt."isActive" = true
      and pt."isActive" = true
      and pt.key = permission_key
  );
$$;
```

## Políticas mínimas futuras

Exemplo para reservas:

```sql
alter table public."Reservation" enable row level security;

create policy "reservation_read"
  on public."Reservation"
  for select
  using (public.has_permission('RESERVATIONS_READ'));

create policy "reservation_create"
  on public."Reservation"
  for insert
  with check (public.has_permission('RESERVATIONS_CREATE'));
```

Exemplo para gestão de permissões:

```sql
alter table public."UserPermissionTag" enable row level security;

create policy "permission_tag_admin_read"
  on public."UserPermissionTag"
  for select
  using (public.has_permission('USERS_READ'));

create policy "permission_tag_admin_write"
  on public."UserPermissionTag"
  for all
  using (public.has_permission('USERS_UPDATE_TAGS'))
  with check (public.has_permission('USERS_UPDATE_TAGS'));
```

## Regras que não podem ser relaxadas

- Usuário pendente não lê dados operacionais.
- Usuário comum não altera `role`, `status`, `isActive` ou tags.
- Admin não é criado por formulário público.
- `AuditLog` não deve permitir update/delete.
- RLS não substitui server actions; ela será camada adicional para acessos Supabase diretos.

## Checklist para hardening futuro

- Habilitar RLS tabela por tabela em ambiente de staging.
- Criar testes SQL para usuário pendente, comum, financeiro, cozinha e admin.
- Validar que policies não quebram jobs Prisma ou rotas API.
- Documentar quais rotas ainda usam Prisma direto e dependem dos guards da aplicação.
