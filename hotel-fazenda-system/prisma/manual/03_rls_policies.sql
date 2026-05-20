-- ===========================================================================
-- 03_rls_policies.sql
--
-- Runbook de Row Level Security (RLS) para o Hotel Fazenda System.
--
-- Habilita RLS em todas as tabelas operacionais e cria policies alinhadas
-- ao registro canônico de permission keys em `lib/auth/permissions.ts`
-- (PERMISSION_TAGS / PERMISSION_PRESETS).
--
-- Princípios:
--   1. Toda key referenciada em has_permission('...') DEVE existir em
--      PERMISSION_TAGS. Validação estática: grep -oE "has_permission\('[A-Z_]+'\)"
--      contra a lista canônica do TS.
--   2. Operações sem permission key equivalente são OMITIDAS — não se cria
--      policy permissiva por conveniência. Ex: DELETE em Room/Guest/Reservation
--      não é exposto via REST porque o sistema usa soft-delete (DEACTIVATE)
--      ou status update (CANCEL).
--   3. Prisma usa connection pool com service-role e bypassa RLS — estas
--      policies só afetam acessos via Supabase REST/JS client. Ver docs/RLS.md.
--   4. AuditLog é append-only: SELECT para AUDIT_LOGS_READ, INSERT para
--      qualquer usuário aprovado, UPDATE/DELETE inexistentes (imutabilidade).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Funções auxiliares de segurança
-- ---------------------------------------------------------------------------
-- Idênticas ao exemplo canônico de docs/RLS.md (linhas 19-48). Não alterar
-- sem atualizar a documentação.

CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public."UserProfile"
  WHERE "authUserId" = auth.uid()
    AND status = 'APPROVED'
    AND "isActive" = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(permission_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."UserPermissionTag" upt
    JOIN public."PermissionTag" pt ON pt.id = upt."permissionTagId"
    WHERE upt."userProfileId" = public.current_user_profile_id()
      AND upt."isActive" = true
      AND pt."isActive" = true
      AND pt.key = permission_key
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Habilitação de RLS nas 14 tabelas operacionais
-- ---------------------------------------------------------------------------

ALTER TABLE public."UserProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PermissionTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserPermissionTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RoomType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Guest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReservationConsumption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FinancialClosing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SyncedOperation" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. UserProfile
-- ---------------------------------------------------------------------------

CREATE POLICY "user_profile_read_self_or_admin" ON public."UserProfile"
  FOR SELECT
  USING (
    "authUserId" = auth.uid()
    OR public.has_permission('USERS_READ')
  );

-- Múltiplas permissions disparam UPDATE em UserProfile: aprovar/rejeitar
-- solicitação, alterar perfil base, bloquear/reativar, conceder tags.
CREATE POLICY "user_profile_write_admin" ON public."UserProfile"
  FOR ALL
  USING (
    public.has_permission('USERS_UPDATE_TAGS')
    OR public.has_permission('USERS_APPROVE')
    OR public.has_permission('USERS_REJECT')
    OR public.has_permission('USERS_UPDATE_ROLE')
    OR public.has_permission('USERS_DEACTIVATE')
    OR public.has_permission('USERS_REACTIVATE')
  )
  WITH CHECK (
    public.has_permission('USERS_UPDATE_TAGS')
    OR public.has_permission('USERS_APPROVE')
    OR public.has_permission('USERS_REJECT')
    OR public.has_permission('USERS_UPDATE_ROLE')
    OR public.has_permission('USERS_DEACTIVATE')
    OR public.has_permission('USERS_REACTIVATE')
  );

-- ---------------------------------------------------------------------------
-- 4. PermissionTag e UserPermissionTag
-- ---------------------------------------------------------------------------

CREATE POLICY "permission_tag_read_all_approved" ON public."PermissionTag"
  FOR SELECT
  USING (public.current_user_profile_id() IS NOT NULL);

CREATE POLICY "permission_tag_write_admin" ON public."PermissionTag"
  FOR ALL
  USING (public.has_permission('USERS_UPDATE_TAGS'))
  WITH CHECK (public.has_permission('USERS_UPDATE_TAGS'));

CREATE POLICY "user_permission_tag_read_admin" ON public."UserPermissionTag"
  FOR SELECT
  USING (public.has_permission('USERS_READ'));

CREATE POLICY "user_permission_tag_write_admin" ON public."UserPermissionTag"
  FOR ALL
  USING (public.has_permission('USERS_UPDATE_TAGS'))
  WITH CHECK (public.has_permission('USERS_UPDATE_TAGS'));

-- ---------------------------------------------------------------------------
-- 5. RoomType e Room
-- ---------------------------------------------------------------------------

CREATE POLICY "room_type_read_approved" ON public."RoomType"
  FOR SELECT
  USING (public.current_user_profile_id() IS NOT NULL);

CREATE POLICY "room_type_write_manage" ON public."RoomType"
  FOR ALL
  USING (public.has_permission('ROOM_TYPES_MANAGE'))
  WITH CHECK (public.has_permission('ROOM_TYPES_MANAGE'));

CREATE POLICY "room_read_approved" ON public."Room"
  FOR SELECT
  USING (public.has_permission('ROOMS_READ'));

CREATE POLICY "room_insert_approved" ON public."Room"
  FOR INSERT
  WITH CHECK (public.has_permission('ROOMS_CREATE'));

CREATE POLICY "room_update_approved" ON public."Room"
  FOR UPDATE
  USING (
    public.has_permission('ROOMS_UPDATE')
    OR public.has_permission('ROOMS_CHANGE_STATUS')
    OR public.has_permission('ROOMS_DEACTIVATE')
  )
  WITH CHECK (
    public.has_permission('ROOMS_UPDATE')
    OR public.has_permission('ROOMS_CHANGE_STATUS')
    OR public.has_permission('ROOMS_DEACTIVATE')
  );

-- DELETE intencionalmente omitido: sistema usa soft-delete (ROOMS_DEACTIVATE)
-- e nunca remove rows de Room.

-- ---------------------------------------------------------------------------
-- 6. Guest
-- ---------------------------------------------------------------------------

CREATE POLICY "guest_read_approved" ON public."Guest"
  FOR SELECT
  USING (public.has_permission('GUESTS_READ'));

CREATE POLICY "guest_insert_approved" ON public."Guest"
  FOR INSERT
  WITH CHECK (public.has_permission('GUESTS_CREATE'));

CREATE POLICY "guest_update_approved" ON public."Guest"
  FOR UPDATE
  USING (
    public.has_permission('GUESTS_UPDATE')
    OR public.has_permission('GUESTS_DEACTIVATE')
  )
  WITH CHECK (
    public.has_permission('GUESTS_UPDATE')
    OR public.has_permission('GUESTS_DEACTIVATE')
  );

-- DELETE intencionalmente omitido: sistema usa GUESTS_DEACTIVATE (soft-delete)
-- preservando histórico de reservas.

-- ---------------------------------------------------------------------------
-- 7. Reservation
-- ---------------------------------------------------------------------------

CREATE POLICY "reservation_read_approved" ON public."Reservation"
  FOR SELECT
  USING (public.has_permission('RESERVATIONS_READ'));

CREATE POLICY "reservation_insert_approved" ON public."Reservation"
  FOR INSERT
  WITH CHECK (public.has_permission('RESERVATIONS_CREATE'));

-- Múltiplas permissions disparam UPDATE no row de Reservation: edição geral,
-- cancelamento (status), check-in/out (datas), mudança de diária, desconto.
CREATE POLICY "reservation_update_approved" ON public."Reservation"
  FOR UPDATE
  USING (
    public.has_permission('RESERVATIONS_UPDATE')
    OR public.has_permission('RESERVATIONS_CANCEL')
    OR public.has_permission('RESERVATIONS_CHECKIN')
    OR public.has_permission('RESERVATIONS_CHECKOUT')
    OR public.has_permission('RESERVATIONS_CHANGE_DAILY_RATE')
    OR public.has_permission('RESERVATIONS_APPLY_DISCOUNT')
  )
  WITH CHECK (
    public.has_permission('RESERVATIONS_UPDATE')
    OR public.has_permission('RESERVATIONS_CANCEL')
    OR public.has_permission('RESERVATIONS_CHECKIN')
    OR public.has_permission('RESERVATIONS_CHECKOUT')
    OR public.has_permission('RESERVATIONS_CHANGE_DAILY_RATE')
    OR public.has_permission('RESERVATIONS_APPLY_DISCOUNT')
  );

-- DELETE intencionalmente omitido: cancelamento é UPDATE de status, não
-- remoção física. Reservas históricas permanecem para auditoria.

-- ---------------------------------------------------------------------------
-- 8. ProductCategory e Product
-- ---------------------------------------------------------------------------

CREATE POLICY "product_category_read_approved" ON public."ProductCategory"
  FOR SELECT
  USING (public.current_user_profile_id() IS NOT NULL);

CREATE POLICY "product_category_write_approved" ON public."ProductCategory"
  FOR ALL
  USING (
    public.has_permission('STOCK_CREATE_PRODUCT')
    OR public.has_permission('STOCK_UPDATE_PRODUCT')
    OR public.has_permission('STOCK_DEACTIVATE_PRODUCT')
  )
  WITH CHECK (
    public.has_permission('STOCK_CREATE_PRODUCT')
    OR public.has_permission('STOCK_UPDATE_PRODUCT')
    OR public.has_permission('STOCK_DEACTIVATE_PRODUCT')
  );

CREATE POLICY "product_read_approved" ON public."Product"
  FOR SELECT
  USING (public.current_user_profile_id() IS NOT NULL);

CREATE POLICY "product_write_approved" ON public."Product"
  FOR ALL
  USING (
    public.has_permission('STOCK_CREATE_PRODUCT')
    OR public.has_permission('STOCK_UPDATE_PRODUCT')
    OR public.has_permission('STOCK_DEACTIVATE_PRODUCT')
  )
  WITH CHECK (
    public.has_permission('STOCK_CREATE_PRODUCT')
    OR public.has_permission('STOCK_UPDATE_PRODUCT')
    OR public.has_permission('STOCK_DEACTIVATE_PRODUCT')
  );

-- ---------------------------------------------------------------------------
-- 9. StockMovement
-- ---------------------------------------------------------------------------

CREATE POLICY "stock_movement_read_approved" ON public."StockMovement"
  FOR SELECT
  USING (public.has_permission('STOCK_READ'));

-- Inserts de StockMovement vêm de 4 fluxos distintos: compra (entrada),
-- ajuste positivo/negativo, consumo interno (cozinha) e desperdício (cozinha).
CREATE POLICY "stock_movement_write_approved" ON public."StockMovement"
  FOR ALL
  USING (
    public.has_permission('STOCK_CREATE_ENTRY')
    OR public.has_permission('STOCK_CREATE_ADJUSTMENT')
    OR public.has_permission('KITCHEN_CREATE_INTERNAL_CONSUMPTION')
    OR public.has_permission('KITCHEN_CREATE_WASTE')
  )
  WITH CHECK (
    public.has_permission('STOCK_CREATE_ENTRY')
    OR public.has_permission('STOCK_CREATE_ADJUSTMENT')
    OR public.has_permission('KITCHEN_CREATE_INTERNAL_CONSUMPTION')
    OR public.has_permission('KITCHEN_CREATE_WASTE')
  );

-- ---------------------------------------------------------------------------
-- 10. ReservationConsumption
-- ---------------------------------------------------------------------------

-- SELECT amplo: cozinha lê consumos próprios; financeiro lê para computar
-- fechamentos.
CREATE POLICY "consumption_read_approved" ON public."ReservationConsumption"
  FOR SELECT
  USING (
    public.has_permission('KITCHEN_READ')
    OR public.has_permission('KITCHEN_VIEW_RECENT_MOVEMENTS')
    OR public.has_permission('FINANCIAL_READ')
  );

CREATE POLICY "consumption_insert_approved" ON public."ReservationConsumption"
  FOR INSERT
  WITH CHECK (public.has_permission('KITCHEN_CREATE_CONSUMPTION'));

-- UPDATE/DELETE intencionalmente omitidos: o sistema não possui permission
-- key para edição de consumo. Reversões devem usar o fluxo de offline-sync
-- (CONSUMPTION_REVERSE em SyncedOperation) que registra contrapartida em
-- AuditLog em vez de mutar o row original.

-- ---------------------------------------------------------------------------
-- 11. FinancialClosing
-- ---------------------------------------------------------------------------

CREATE POLICY "closing_read_approved" ON public."FinancialClosing"
  FOR SELECT
  USING (public.has_permission('FINANCIAL_READ'));

CREATE POLICY "closing_insert_approved" ON public."FinancialClosing"
  FOR INSERT
  WITH CHECK (public.has_permission('FINANCIAL_CREATE_CLOSING'));

-- Múltiplas permissions disparam UPDATE: atualizar pagamento, aplicar
-- desconto/extra, reabrir fechamento.
CREATE POLICY "closing_update_approved" ON public."FinancialClosing"
  FOR UPDATE
  USING (
    public.has_permission('FINANCIAL_UPDATE_PAYMENT_STATUS')
    OR public.has_permission('FINANCIAL_APPLY_DISCOUNT')
    OR public.has_permission('FINANCIAL_APPLY_EXTRA')
    OR public.has_permission('FINANCIAL_REOPEN_CLOSING')
  )
  WITH CHECK (
    public.has_permission('FINANCIAL_UPDATE_PAYMENT_STATUS')
    OR public.has_permission('FINANCIAL_APPLY_DISCOUNT')
    OR public.has_permission('FINANCIAL_APPLY_EXTRA')
    OR public.has_permission('FINANCIAL_REOPEN_CLOSING')
  );

-- DELETE intencionalmente omitido: fechamentos são reabertos
-- (FINANCIAL_REOPEN_CLOSING), nunca removidos. Histórico financeiro é
-- imutável para auditoria.

-- ---------------------------------------------------------------------------
-- 12. SyncedOperation (offline sync)
-- ---------------------------------------------------------------------------

CREATE POLICY "synced_op_read_self" ON public."SyncedOperation"
  FOR SELECT
  USING ("actorId" = public.current_user_profile_id());

CREATE POLICY "synced_op_insert_self" ON public."SyncedOperation"
  FOR INSERT
  WITH CHECK ("actorId" = public.current_user_profile_id());

-- ---------------------------------------------------------------------------
-- 13. AuditLog (append-only)
-- ---------------------------------------------------------------------------

CREATE POLICY "audit_log_read_admin" ON public."AuditLog"
  FOR SELECT
  USING (public.has_permission('AUDIT_LOGS_READ'));

CREATE POLICY "audit_log_insert_approved" ON public."AuditLog"
  FOR INSERT
  WITH CHECK (public.current_user_profile_id() IS NOT NULL);

-- UPDATE e DELETE intencionalmente sem policy: sem policy = nada passa,
-- garantindo imutabilidade forense do histórico para fins de conformidade.
