-- Sprint 7 — PWA, offline e sincronização resiliente
-- Idempotency keys on domain tables + SyncedOperation registry.
-- All changes are additive (nullable columns, new table) — safe to apply
-- on existing data without backfill.

-- AlterTable Reservation
ALTER TABLE "Reservation" ADD COLUMN "idempotencyKey" UUID;
ALTER TABLE "Reservation" ADD COLUMN "origin" TEXT;

-- AlterTable StockMovement
ALTER TABLE "StockMovement" ADD COLUMN "idempotencyKey" UUID;
ALTER TABLE "StockMovement" ADD COLUMN "origin" TEXT;

-- AlterTable ReservationConsumption
ALTER TABLE "ReservationConsumption" ADD COLUMN "idempotencyKey" UUID;
ALTER TABLE "ReservationConsumption" ADD COLUMN "origin" TEXT;

-- CreateIndex (unique partial via standard unique — Postgres allows multiple NULLs)
CREATE UNIQUE INDEX "Reservation_idempotencyKey_key" ON "Reservation"("idempotencyKey");
CREATE UNIQUE INDEX "StockMovement_idempotencyKey_key" ON "StockMovement"("idempotencyKey");
CREATE UNIQUE INDEX "ReservationConsumption_idempotencyKey_key" ON "ReservationConsumption"("idempotencyKey");

-- CreateTable SyncedOperation
CREATE TABLE "SyncedOperation" (
    "id" UUID NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "operationType" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" UUID,
    "actorId" UUID,
    "result" TEXT NOT NULL,
    "errorMessage" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncedOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex SyncedOperation
CREATE UNIQUE INDEX "SyncedOperation_idempotencyKey_key" ON "SyncedOperation"("idempotencyKey");
CREATE INDEX "SyncedOperation_actorId_createdAt_idx" ON "SyncedOperation"("actorId", "createdAt");
CREATE INDEX "SyncedOperation_result_createdAt_idx" ON "SyncedOperation"("result", "createdAt");

-- AddForeignKey SyncedOperation -> UserProfile
ALTER TABLE "SyncedOperation"
    ADD CONSTRAINT "SyncedOperation_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "UserProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
