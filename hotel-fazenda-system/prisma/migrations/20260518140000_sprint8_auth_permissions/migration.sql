-- Sprint 8: add the locked-down base role first.
-- PostgreSQL requires a commit before a new enum value can be used by later
-- defaults, columns, or data changes.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'UNASSIGNED';
