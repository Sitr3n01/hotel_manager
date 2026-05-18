-- Manual migration: prevent overlapping reservations on the same room
--
-- Run this ONCE after the Sprint 3 deploy. Reapply after every
-- `prisma migrate reset`. Apply via Supabase SQL Editor or `psql` using
-- DIRECT_URL (port 5432, not the pooler).
--
-- What it does: Postgres-level guarantee that two reservations on the same
-- room cannot overlap in time, BUT only while at least one of them is in
-- an "occupying" status (PRE_RESERVED, CONFIRMED, CHECKED_IN). Terminal
-- statuses (CHECKED_OUT, CANCELLED, NO_SHOW) are exempt so historical
-- records of the same room/period coexist.
--
-- The `btree_gist` extension is needed because GiST exclusion combines
-- the scalar "roomId" with the daterange. Without it, GiST cannot index
-- the equality side of the constraint.
--
-- The application layer (lib/availability.ts + lib/actions/reservation.ts)
-- already pre-checks overlap and returns a friendly Portuguese error. This
-- constraint exists as a race-condition safety net for concurrent writes.
--
-- This is idempotent: re-running drops the existing constraint first.

create extension if not exists btree_gist;

alter table "Reservation"
  drop constraint if exists reservation_no_overlap_per_room;

alter table "Reservation"
  add constraint reservation_no_overlap_per_room
  exclude using gist (
    "roomId" with =,
    daterange("checkInDate", "checkOutDate", '[)') with &&
  )
  where (status in ('PRE_RESERVED', 'CONFIRMED', 'CHECKED_IN'));
