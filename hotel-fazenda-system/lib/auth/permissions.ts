import type { Role } from "@prisma/client";

export type PermissionCategory =
  | "Módulos"
  | "Quartos"
  | "Reservas"
  | "Hóspedes"
  | "Cozinha"
  | "Estoque"
  | "Financeiro"
  | "Relatórios"
  | "Administração";

export type PermissionDefinition = {
  key: string;
  name: string;
  description: string;
  category: PermissionCategory;
};

export const PERMISSION_TAGS = [
  tag("ACCESS_DASHBOARD", "Acessar dashboard", "Visualiza a página inicial e atalhos operacionais.", "Módulos"),
  tag("ACCESS_ROOMS", "Acessar quartos", "Visualiza o módulo de quartos.", "Módulos"),
  tag("ACCESS_RESERVATIONS", "Acessar reservas", "Visualiza o módulo de reservas.", "Módulos"),
  tag("ACCESS_GUESTS", "Acessar hóspedes", "Visualiza o módulo de hóspedes.", "Módulos"),
  tag("ACCESS_KITCHEN", "Acessar cozinha", "Visualiza o módulo de cozinha.", "Módulos"),
  tag("ACCESS_STOCK", "Acessar estoque", "Visualiza o módulo de estoque.", "Módulos"),
  tag("ACCESS_FINANCIAL", "Acessar financeiro", "Visualiza o módulo financeiro.", "Módulos"),
  tag("ACCESS_REPORTS", "Acessar relatórios", "Visualiza o módulo de relatórios.", "Módulos"),
  tag("ACCESS_SETTINGS", "Acessar configurações", "Visualiza configurações da conta e áreas administrativas permitidas.", "Módulos"),
  tag("ACCESS_USERS_ADMIN", "Acessar gestão de usuários", "Visualiza a administração de usuários e permissões.", "Módulos"),

  tag("ROOMS_READ", "Ver quartos", "Consulta quartos e tipos de quarto.", "Quartos"),
  tag("ROOMS_CREATE", "Criar quartos", "Cadastra novos quartos.", "Quartos"),
  tag("ROOMS_UPDATE", "Editar quartos", "Edita dados cadastrais de quartos.", "Quartos"),
  tag("ROOMS_CHANGE_STATUS", "Alterar status de quartos", "Move quartos entre disponível, reservado, ocupado e manutenção.", "Quartos"),
  tag("ROOMS_DEACTIVATE", "Inativar quartos", "Inativa quartos sem excluir histórico.", "Quartos"),
  tag("ROOM_TYPES_MANAGE", "Gerenciar tipos de quarto", "Cria, edita e inativa tipos de quarto.", "Quartos"),

  tag("RESERVATIONS_READ", "Ver reservas", "Consulta reservas e detalhes operacionais.", "Reservas"),
  tag("RESERVATIONS_CREATE", "Criar reservas", "Cria novas reservas.", "Reservas"),
  tag("RESERVATIONS_UPDATE", "Editar reservas", "Edita dados operacionais de reservas.", "Reservas"),
  tag("RESERVATIONS_CANCEL", "Cancelar reservas", "Cancela reservas conforme regras de negócio.", "Reservas"),
  tag("RESERVATIONS_CHECKIN", "Fazer check-in", "Registra entrada de hóspedes.", "Reservas"),
  tag("RESERVATIONS_CHECKOUT", "Fazer check-out", "Registra saída de hóspedes.", "Reservas"),
  tag("RESERVATIONS_CHANGE_DAILY_RATE", "Alterar diária", "Permite mudar valor da diária em reservas.", "Reservas"),
  tag("RESERVATIONS_APPLY_DISCOUNT", "Aplicar desconto em reserva", "Permite lançar descontos na reserva.", "Reservas"),

  tag("GUESTS_READ", "Ver hóspedes", "Consulta cadastro de hóspedes.", "Hóspedes"),
  tag("GUESTS_CREATE", "Criar hóspedes", "Cadastra novos hóspedes.", "Hóspedes"),
  tag("GUESTS_UPDATE", "Editar hóspedes", "Atualiza dados cadastrais de hóspedes.", "Hóspedes"),
  tag("GUESTS_DEACTIVATE", "Inativar hóspedes", "Inativa hóspedes sem apagar histórico.", "Hóspedes"),

  tag("KITCHEN_READ", "Ver cozinha", "Consulta telas e movimentos da cozinha.", "Cozinha"),
  tag("KITCHEN_CREATE_CONSUMPTION", "Lançar consumo de hóspede", "Registra consumo vinculado a reservas.", "Cozinha"),
  tag("KITCHEN_CREATE_INTERNAL_CONSUMPTION", "Lançar consumo interno", "Registra consumo operacional interno.", "Cozinha"),
  tag("KITCHEN_CREATE_WASTE", "Lançar desperdício", "Registra perdas e desperdícios.", "Cozinha"),
  tag("KITCHEN_VIEW_RECENT_MOVEMENTS", "Ver movimentos recentes", "Consulta histórico recente da cozinha.", "Cozinha"),

  tag("STOCK_READ", "Ver estoque", "Consulta produtos, categorias e movimentos.", "Estoque"),
  tag("STOCK_CREATE_PRODUCT", "Criar produtos", "Cadastra produtos e categorias.", "Estoque"),
  tag("STOCK_UPDATE_PRODUCT", "Editar produtos", "Atualiza produtos e categorias.", "Estoque"),
  tag("STOCK_DEACTIVATE_PRODUCT", "Inativar produtos", "Inativa produtos e categorias sem apagar histórico.", "Estoque"),
  tag("STOCK_CREATE_ENTRY", "Registrar entrada", "Lança compras e entradas de estoque.", "Estoque"),
  tag("STOCK_CREATE_ADJUSTMENT", "Ajustar estoque", "Lança ajustes positivos ou negativos.", "Estoque"),
  tag("STOCK_VIEW_LOW_STOCK", "Ver estoque baixo", "Visualiza alertas de estoque mínimo.", "Estoque"),
  tag("STOCK_VIEW_COSTS", "Ver custos", "Visualiza custo médio e custos estimados.", "Estoque"),

  tag("FINANCIAL_READ", "Ver financeiro", "Consulta fechamentos e valores financeiros.", "Financeiro"),
  tag("FINANCIAL_CREATE_CLOSING", "Criar fechamento", "Cria e finaliza fechamentos de reserva.", "Financeiro"),
  tag("FINANCIAL_UPDATE_PAYMENT_STATUS", "Atualizar pagamento", "Altera status e método de pagamento.", "Financeiro"),
  tag("FINANCIAL_APPLY_DISCOUNT", "Aplicar desconto financeiro", "Aplica desconto no fechamento.", "Financeiro"),
  tag("FINANCIAL_APPLY_EXTRA", "Aplicar extra financeiro", "Aplica valores extras no fechamento.", "Financeiro"),
  tag("FINANCIAL_REOPEN_CLOSING", "Reabrir fechamento", "Reabre fechamento finalizado com justificativa.", "Financeiro"),
  tag("FINANCIAL_EXPORT_EXCEL", "Exportar financeiro", "Exporta fechamentos para planilha.", "Financeiro"),

  tag("REPORTS_READ_OPERATIONAL", "Ver relatórios operacionais", "Consulta relatórios de ocupação e reservas.", "Relatórios"),
  tag("REPORTS_READ_KITCHEN", "Ver relatórios de cozinha", "Consulta consumo, desperdício e estoque baixo.", "Relatórios"),
  tag("REPORTS_READ_FINANCIAL", "Ver relatórios financeiros", "Consulta receita e pagamentos.", "Relatórios"),
  tag("REPORTS_EXPORT_EXCEL", "Exportar relatórios", "Exporta relatórios para planilha.", "Relatórios"),

  tag("USERS_READ", "Ver usuários", "Consulta usuários e solicitações pendentes.", "Administração"),
  tag("USERS_APPROVE", "Aprovar usuários", "Aprova solicitações de acesso.", "Administração"),
  tag("USERS_REJECT", "Rejeitar usuários", "Rejeita solicitações de acesso.", "Administração"),
  tag("USERS_UPDATE_ROLE", "Alterar perfil base", "Altera o perfil organizacional do usuário.", "Administração"),
  tag("USERS_UPDATE_TAGS", "Alterar permissões", "Concede, revoga e aplica presets de tags.", "Administração"),
  tag("USERS_DEACTIVATE", "Bloquear usuários", "Bloqueia ou inativa usuários.", "Administração"),
  tag("USERS_REACTIVATE", "Reativar usuários", "Reativa usuários bloqueados ou inativos.", "Administração"),
  tag("AUDIT_LOGS_READ", "Ver auditoria", "Consulta logs administrativos e operacionais.", "Administração"),
  tag("SYSTEM_SETTINGS_MANAGE", "Gerenciar configurações", "Altera configurações críticas do sistema.", "Administração"),
] as const satisfies readonly PermissionDefinition[];

export type PermissionKey = (typeof PERMISSION_TAGS)[number]["key"];

export const ALL_PERMISSION_KEYS = PERMISSION_TAGS.map((permission) => permission.key) as PermissionKey[];

export const PERMISSION_LABELS: Record<PermissionKey, string> = Object.fromEntries(
  PERMISSION_TAGS.map((permission) => [permission.key, permission.name]),
) as Record<PermissionKey, string>;

export const PERMISSION_PRESETS = {
  ADMIN: ALL_PERMISSION_KEYS,
  GERENCIA: [
    "ACCESS_DASHBOARD",
    "ACCESS_ROOMS",
    "ACCESS_RESERVATIONS",
    "ACCESS_GUESTS",
    "ACCESS_KITCHEN",
    "ACCESS_STOCK",
    "ACCESS_FINANCIAL",
    "ACCESS_REPORTS",
    "ROOMS_READ",
    "ROOMS_CREATE",
    "ROOMS_UPDATE",
    "ROOMS_CHANGE_STATUS",
    "ROOM_TYPES_MANAGE",
    "RESERVATIONS_READ",
    "RESERVATIONS_CREATE",
    "RESERVATIONS_UPDATE",
    "RESERVATIONS_CANCEL",
    "RESERVATIONS_CHECKIN",
    "RESERVATIONS_CHECKOUT",
    "RESERVATIONS_CHANGE_DAILY_RATE",
    "RESERVATIONS_APPLY_DISCOUNT",
    "GUESTS_READ",
    "GUESTS_CREATE",
    "GUESTS_UPDATE",
    "KITCHEN_READ",
    "STOCK_READ",
    "STOCK_VIEW_COSTS",
    "FINANCIAL_READ",
    "FINANCIAL_CREATE_CLOSING",
    "FINANCIAL_UPDATE_PAYMENT_STATUS",
    "FINANCIAL_APPLY_DISCOUNT",
    "FINANCIAL_APPLY_EXTRA",
    "FINANCIAL_REOPEN_CLOSING",
    "REPORTS_READ_OPERATIONAL",
    "REPORTS_READ_KITCHEN",
    "REPORTS_READ_FINANCIAL",
    "REPORTS_EXPORT_EXCEL",
    "AUDIT_LOGS_READ",
  ],
  SECRETARIA: [
    "ACCESS_DASHBOARD",
    "ACCESS_ROOMS",
    "ACCESS_RESERVATIONS",
    "ACCESS_GUESTS",
    "ROOMS_READ",
    "RESERVATIONS_READ",
    "RESERVATIONS_CREATE",
    "RESERVATIONS_UPDATE",
    "RESERVATIONS_CANCEL",
    "RESERVATIONS_CHECKIN",
    "RESERVATIONS_CHECKOUT",
    "GUESTS_READ",
    "GUESTS_CREATE",
    "GUESTS_UPDATE",
    "REPORTS_READ_OPERATIONAL",
  ],
  COZINHA: [
    "ACCESS_DASHBOARD",
    "ACCESS_KITCHEN",
    "ACCESS_STOCK",
    "KITCHEN_READ",
    "KITCHEN_CREATE_CONSUMPTION",
    "KITCHEN_CREATE_INTERNAL_CONSUMPTION",
    "KITCHEN_CREATE_WASTE",
    "KITCHEN_VIEW_RECENT_MOVEMENTS",
    "STOCK_READ",
    "STOCK_CREATE_ENTRY",
    "STOCK_VIEW_LOW_STOCK",
  ],
  FINANCEIRO: [
    "ACCESS_DASHBOARD",
    "ACCESS_RESERVATIONS",
    "ACCESS_FINANCIAL",
    "ACCESS_REPORTS",
    "RESERVATIONS_READ",
    "GUESTS_READ",
    "FINANCIAL_READ",
    "FINANCIAL_CREATE_CLOSING",
    "FINANCIAL_UPDATE_PAYMENT_STATUS",
    "FINANCIAL_APPLY_DISCOUNT",
    "FINANCIAL_APPLY_EXTRA",
    "FINANCIAL_EXPORT_EXCEL",
    "REPORTS_READ_OPERATIONAL",
    "REPORTS_READ_FINANCIAL",
    "REPORTS_EXPORT_EXCEL",
  ],
  UNASSIGNED: [],
} as const satisfies Record<Role, readonly PermissionKey[]>;

export type AccessSubject =
  | Role
  | readonly PermissionKey[]
  | { role?: Role; permissions?: readonly PermissionKey[] }
  | null
  | undefined;

export function hasPermission(subject: AccessSubject, permission: PermissionKey): boolean {
  return resolvePermissionSet(subject).has(permission);
}

export function hasAnyPermission(subject: AccessSubject, permissions: readonly PermissionKey[]): boolean {
  const granted = resolvePermissionSet(subject);
  return permissions.some((permission) => granted.has(permission));
}

export function hasAllPermissions(subject: AccessSubject, permissions: readonly PermissionKey[]): boolean {
  const granted = resolvePermissionSet(subject);
  return permissions.every((permission) => granted.has(permission));
}

export function isPermissionKey(value: string): value is PermissionKey {
  return (ALL_PERMISSION_KEYS as readonly string[]).includes(value);
}

export function normalizePermissionKeys(values: readonly string[]): PermissionKey[] {
  return values.filter(isPermissionKey);
}

export function permissionsByCategory() {
  return PERMISSION_TAGS.reduce<Record<PermissionCategory, typeof PERMISSION_TAGS[number][]>>(
    (groups, permission) => {
      groups[permission.category] ??= [];
      groups[permission.category].push(permission);
      return groups;
    },
    {} as Record<PermissionCategory, typeof PERMISSION_TAGS[number][]>,
  );
}

function resolvePermissionSet(subject: AccessSubject): Set<PermissionKey> {
  if (!subject) return new Set();
  if (typeof subject === "string") return new Set(PERMISSION_PRESETS[subject]);
  if (Array.isArray(subject)) return new Set(subject as readonly PermissionKey[]);
  const candidate = subject as { role?: Role; permissions?: readonly PermissionKey[] };
  if (candidate.permissions) return new Set(candidate.permissions);
  if (candidate.role) return new Set(PERMISSION_PRESETS[candidate.role]);
  return new Set();
}

function tag<const Key extends string>(
  key: Key,
  name: string,
  description: string,
  category: PermissionCategory,
): PermissionDefinition & { key: Key } {
  return { key, name, description, category };
}
