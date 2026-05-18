-- Sprint 8: approval workflow, permission tags, and admin audit support.

CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED', 'INACTIVE');

ALTER TABLE "UserProfile"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" UUID,
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedById" UUID,
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "requestedRole" "Role",
  ADD COLUMN "requestMessage" TEXT,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "UserProfile" ALTER COLUMN "role" SET DEFAULT 'UNASSIGNED';
ALTER TABLE "UserProfile" ALTER COLUMN "isActive" SET DEFAULT false;

ALTER TABLE "Guest" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "PermissionTag" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PermissionTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPermissionTag" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userProfileId" UUID NOT NULL,
  "permissionTagId" UUID NOT NULL,
  "grantedById" UUID,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedById" UUID,
  "revokedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserPermissionTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PermissionTag_key_key" ON "PermissionTag"("key");
CREATE INDEX "PermissionTag_category_isActive_idx" ON "PermissionTag"("category", "isActive");

CREATE UNIQUE INDEX "UserPermissionTag_userProfileId_permissionTagId_key"
  ON "UserPermissionTag"("userProfileId", "permissionTagId");
CREATE INDEX "UserPermissionTag_permissionTagId_isActive_idx"
  ON "UserPermissionTag"("permissionTagId", "isActive");
CREATE INDEX "UserPermissionTag_grantedById_idx" ON "UserPermissionTag"("grantedById");
CREATE INDEX "UserPermissionTag_revokedById_idx" ON "UserPermissionTag"("revokedById");

CREATE INDEX "UserProfile_status_isActive_idx" ON "UserProfile"("status", "isActive");
CREATE INDEX "UserProfile_role_idx" ON "UserProfile"("role");
CREATE INDEX "UserProfile_approvedById_idx" ON "UserProfile"("approvedById");
CREATE INDEX "UserProfile_rejectedById_idx" ON "UserProfile"("rejectedById");
CREATE INDEX "Guest_isActive_idx" ON "Guest"("isActive");

ALTER TABLE "UserProfile"
  ADD CONSTRAINT "UserProfile_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserProfile"
  ADD CONSTRAINT "UserProfile_rejectedById_fkey"
  FOREIGN KEY ("rejectedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserPermissionTag"
  ADD CONSTRAINT "UserPermissionTag_userProfileId_fkey"
  FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPermissionTag"
  ADD CONSTRAINT "UserPermissionTag_permissionTagId_fkey"
  FOREIGN KEY ("permissionTagId") REFERENCES "PermissionTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPermissionTag"
  ADD CONSTRAINT "UserPermissionTag_grantedById_fkey"
  FOREIGN KEY ("grantedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserPermissionTag"
  ADD CONSTRAINT "UserPermissionTag_revokedById_fkey"
  FOREIGN KEY ("revokedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
