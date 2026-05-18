# Autenticação e permissões

## Princípio

Autenticação responde quem é o usuário. Autorização responde o que ele pode fazer.

O sistema usa Supabase Auth para login e `UserProfile` + `PermissionTag` + `UserPermissionTag` para autorização interna. O frontend pode esconder menus e botões, mas toda ação crítica deve validar permissão no servidor.

## Fluxos

### Login aprovado

1. Usuário entra em `/login`.
2. `login()` autentica no Supabase Auth.
3. O servidor busca `UserProfile`.
4. Só entra se `status = APPROVED` e `isActive = true`.
5. As tags ativas são carregadas server-side.
6. O usuário vai para `/dashboard`.

Usuários pendentes são enviados para `/aguardando-aprovacao`. Usuários rejeitados, bloqueados, inativos ou sem perfil recebem mensagem humana no login.

### Solicitação de acesso

1. Usuário acessa `/solicitar-acesso`.
2. Informa nome, e-mail, telefone opcional, função desejada, observação e senha.
3. Server action usa Supabase Admin no servidor para criar a credencial.
4. `UserProfile` fica `UNASSIGNED`, `PENDING` e `isActive = false`.
5. Admin aprova, rejeita ou ajusta permissões em `/configuracoes/usuarios`.

## Perfis base

`Role` é perfil organizacional e preset inicial:

- `ADMIN`
- `GERENCIA`
- `SECRETARIA`
- `COZINHA`
- `FINANCEIRO`
- `UNASSIGNED`

Permissão real vem das tags ativas do usuário. O perfil base ajuda a aplicar presets e a orientar a UI.

## Tags e presets

As tags oficiais vivem em `lib/auth/permissions.ts` e são semeadas pelo seed em `PermissionTag`.

- `ADMIN`: todas as tags.
- `GERENCIA`: operação ampla, financeiro e relatórios, sem gestão de usuários por padrão.
- `SECRETARIA`: quartos, reservas, hóspedes e relatório operacional.
- `COZINHA`: cozinha, consumo, desperdício, leitura/entrada de estoque e estoque baixo.
- `FINANCEIRO`: financeiro, leitura de reservas/hóspedes e relatórios financeiros.

Admin pode aplicar preset e depois adicionar ou remover tags individualmente.

## Helpers

Servidor:

- `getCurrentUser()` retorna apenas usuário aprovado/ativo com `permissions`.
- `requireAuth()` redireciona por status.
- `hasPermission(user, "TAG")` e `hasAnyPermission(user, [...])` checam tags.
- `requirePermission()`, `requireAnyPermission()` e `requireAdmin()` protegem páginas server-side.

Client:

- Usa as mesmas funções apenas para UX: esconder menu, card ou botão.
- Nunca usa `localStorage`, metadata do Auth ou role vindo do client como fonte confiável.

## Admin inicial

O primeiro Admin é criado pelo seed:

```bash
ADMIN_EMAIL=admin@hotelfazenda.local
ADMIN_PASSWORD=<senha forte>
npm run db:seed
```

O seed usa `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor, cria/atualiza o usuário no Supabase Auth, marca o perfil como `APPROVED`, `ADMIN`, `isActive = true` e concede todas as tags.

## Auditoria

`AuditLog` registra:

- solicitação de acesso;
- aprovação e rejeição;
- bloqueio e reativação;
- alteração de perfil base;
- aplicação de preset;
- concessão/revogação de tags;
- acesso administrativo negado quando viável;
- ações operacionais críticas já existentes.

Auditoria é append-only no uso da aplicação. Não há exclusão física de usuários com histórico.

## Testes manuais

- Sem login, acessar `/dashboard` deve ir para `/login`.
- Usuário pendente deve ir para `/aguardando-aprovacao`.
- Admin aprova novo usuário com preset Secretaria.
- Remover uma tag de módulo deve remover o item da sidebar.
- Acessar URL sem permissão deve voltar ao dashboard ou negar server-side.
- Usuário comum não acessa `/configuracoes/usuarios`.
- Alterações administrativas aparecem em `/configuracoes/auditoria`.
