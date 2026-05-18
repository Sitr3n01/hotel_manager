# Filosofia de Design — Hotel Fazenda

> **Inspiração**: Material Design (Google), sem copiar identidade visual proprietária.
> **Objetivo**: simplicidade, clareza e familiaridade para usuários não técnicos (gerência, secretaria, cozinha, financeiro).

---

## Princípios

1. **Clareza acima de estética sofisticada.** Se um botão pode ser confundido com outra coisa, mude o botão.
2. **Ação principal sempre evidente.** Uma tela = uma ação primária dominante.
3. **Cards separam contextos.** Cada card carrega uma responsabilidade clara, com título, descrição e ação.
4. **Espaçamento generoso.** Conforto visual > densidade. Não comprime tabelas, formulários nem cards.
5. **Estados visuais explícitos.** Loading, sucesso, erro, aviso e desativado têm cores e ícones próprios.
6. **Linguagem em português, sem jargão técnico.** "Reserva confirmada", não "Status: CONFIRMED".
7. **Acessível por padrão.** Contraste 4.5:1 mínimo, foco visível, labels claras, suporte a teclado.
8. **Responsivo de verdade.** Funciona em celular (cozinha), tablet (secretaria) e desktop (gerência).

---

## Sistema de cores

Inspirado no Material Design / Google, mapeado nos tokens do shadcn/ui (em [`app/globals.css`](../app/globals.css)).

| Token | Cor | Uso |
|---|---|---|
| `background` | `#F8FAFD` | Fundo geral da página (off-white levemente azulado) |
| `card` / `popover` | `#FFFFFF` | Superfícies elevadas (cards, modais, menus) |
| `muted` / `secondary` | `#F1F3F4` | Áreas neutras, badges secundárias |
| `border` / `input` | `#DADCE0` | Bordas e divisores |
| `foreground` | `#202124` | Texto principal (preto suave, nunca `#000`) |
| `muted-foreground` | `#5F6368` | Texto secundário, descrições |
| `primary` | `#1A73E8` | Ação principal, links, foco — **Google Blue** |
| `primary-foreground` | `#FFFFFF` | Texto sobre primary |
| `destructive` | `#D93025` | Erro, ação destrutiva |
| `--color-success` | `#188038` | Verde do Google para sucessos (custom, não shadcn) |
| `--color-warning` | `#F9AB00` | Âmbar do Google para warnings (custom) |

**Sempre use o token, nunca o hex direto em componentes.** Se mudarmos a paleta amanhã, todo o sistema acompanha.

---

## Tipografia

- **Fonte primária**: Roboto (família Google, livre, padrão Material). Carregada via `next/font/google`.
- **Fonte mono**: Roboto Mono (para códigos, hashes, IDs).
- **Escala**:
  - `text-xs` (12px) — metadados, labels de input
  - `text-sm` (14px) — corpo padrão
  - `text-base` (16px) — corpo de leitura
  - `text-lg` / `text-xl` — títulos de card
  - `text-2xl` (24px) — título de página
  - `text-3xl` (30px) — display, raro
- **Peso**: 400 para corpo, 500 para labels/UI, 600 para títulos. **Nunca** use `font-bold` (700) em texto corrido.

---

## Elevation (sombras)

Inspirado nas 6 elevations do Material 2, simplificado para 3 níveis:

| Token | Uso | Definição |
|---|---|---|
| `--shadow-1` | Card padrão em repouso | `0 1px 2px 0 rgba(60,64,67,0.08), 0 1px 3px 1px rgba(60,64,67,0.05)` |
| `--shadow-2` | Card em hover, sidebar | `0 1px 2px 0 rgba(60,64,67,0.12), 0 2px 6px 2px rgba(60,64,67,0.08)` |
| `--shadow-3` | Modal, popover, sheet | `0 4px 8px 3px rgba(60,64,67,0.10), 0 1px 3px 0 rgba(60,64,67,0.18)` |

Aplicar via `shadow-[var(--shadow-1)]` ou criar utilitários no `globals.css`.

**Não use** `shadow-lg`, `shadow-2xl`, drop-shadows fortes ou inner shadows decorativos — quebra a coerência Material.

---

## Bordas e raios

- `radius`: **8px** (default), arredondamento confortável típico do Material.
- Cards, inputs e botões usam `rounded-lg` (8px).
- Avatars usam `rounded-full`.
- Modais usam `rounded-xl` (12px).
- **Não use** `rounded-sm` (2px) — visual muito flat.

---

## Componentes (padrões)

### Botões

- **Primário (`Button`)**: cor `primary`, texto branco, sombra leve em hover. Usado para a ação principal da tela.
- **Secundário (`Button variant="outline"`)**: fundo branco, borda `border`. Para ações alternativas.
- **Ghost (`Button variant="ghost"`)**: sem fundo, sem borda. Para ações terciárias e itens de menu.
- **Destrutivo (`Button variant="destructive"`)**: para "Excluir", "Cancelar reserva", "Reabrir fechamento".
- **Tamanho**: `default` (h-9, ~36px) na maioria. `sm` para inline actions. **Nunca** `lg` exceto em CTAs únicos.
- **Ícones**: sempre `h-4 w-4`, à esquerda do texto, com `gap-2`.

### Cards

```tsx
<Card>
  <CardHeader>
    <CardTitle>Título claro</CardTitle>
    <CardDescription>Explicação em uma frase.</CardDescription>
  </CardHeader>
  <CardContent>{/* conteúdo */}</CardContent>
</Card>
```

Espaçamento padrão: `space-y-4` ou `space-y-6` entre cards.

### Inputs e formulários

- `Label` **sempre** acompanha o `Input`.
- Mensagens de erro abaixo do input, `text-sm text-destructive`.
- Validação no blur (não no keystroke) — menos ruído.
- Use schemas Zod compartilhados entre client e server (ver `lib/validations/`).

### Estados

| Estado | Visual |
|---|---|
| Loading | Botão com texto "Carregando..." (não spinner que pisca). Skeleton para listas. |
| Sucesso | Toast verde (`bg-success/10`), ou badge. Não usa popup modal. |
| Erro | Toast vermelho **OU** mensagem inline abaixo do input. Para erros sistêmicos, card com ícone. |
| Aviso | Cor `warning` (`#F9AB00`) com ícone de triângulo. Não bloqueante. |
| Desativado | `opacity-50`, `cursor-not-allowed`. Sempre com tooltip explicando o porquê. |

### Badges

- `default` (primary) — destaque positivo
- `secondary` — neutro (perfil de usuário, contagens)
- `outline` — meta (versão, sprint)
- `destructive` — erro, alerta
- Sempre com texto curto (1-2 palavras) e font-normal.

### Tabelas

- Cabeçalho em `text-xs uppercase tracking-wider text-muted-foreground`.
- Linhas com `hover:bg-muted/50`.
- Padding por célula `px-4 py-3`.
- Para conjuntos > 20 linhas, paginação obrigatória.

---

## Layout

- **Container max-width**: `max-w-7xl` (1280px) na maioria das telas. Dashboard pode ir até `max-w-screen-2xl`.
- **Padding lateral**: `px-4` mobile, `px-6` tablet, `px-8` desktop.
- **Sidebar fixa** em desktop (≥768px), `Sheet` deslizante em mobile.
- **Header** sempre visível (sticky top), `h-14`, com `border-b`.
- **Main content** começa abaixo do header com `p-4 md:p-6`.

---

## Iconografia

- Usar **Lucide** (já integrado ao shadcn). Linha fina, estilo geométrico, parente próximo do Material Icons.
- Tamanho padrão: `h-4 w-4` (16px) para inline; `h-5 w-5` (20px) para sidebar.
- Cor: herda do texto (`currentColor`). Para ícones decorativos: `text-muted-foreground`.

---

## Animações

- **Suaves**, nunca chamativas. `transition-colors`, `transition-opacity` curtos (150-200ms).
- **Não** usar bounces, flips, ou efeitos exagerados.
- Skeleton loader (shadcn) > spinner para listas.
- Modais entram com fade + leve translate (já vem do shadcn).

---

## O que evitar

- ❌ Visual gamer, neon, cyberpunk
- ❌ Glassmorphism (frosted glass)
- ❌ Gradientes em backgrounds amplos
- ❌ Modo escuro como default (preparado mas só ativa por opção do usuário no futuro)
- ❌ Mais de 2 cores fortes na mesma tela
- ❌ Drop shadows fortes em todos os elementos
- ❌ Animações ao scroll
- ❌ Tooltips em tudo (só onde a UI sozinha não explica)
- ❌ Sidebar com cor primária dominante (Material usa estado ativo sutil)

---

## Onde isso vive no código

- **Tokens**: [`app/globals.css`](../app/globals.css) — fonte da verdade do sistema.
- **Componentes base**: [`components/ui/`](../components/ui/) — shadcn, não editar manualmente.
- **Componentes do projeto**: [`components/layout/`](../components/layout/) e [`components/shared/`](../components/shared/) — aqui aplicamos os tokens.
- **Tipografia**: [`app/layout.tsx`](../app/layout.tsx) — Roboto via `next/font/google`.

Quando adicionar tela nova, abra este doc primeiro. Cores e espaçamentos devem vir do sistema, não de decisões pontuais.
