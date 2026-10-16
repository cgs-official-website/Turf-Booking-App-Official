-- Migration 006: User Tournaments & Extended Fields
-- Allows both VENDOR and USER tournaments within the unified tournaments table

BEGIN;

ALTER TABLE "tournaments" 
  ADD COLUMN IF NOT EXISTS "creator_type" VARCHAR(32) NOT NULL DEFAULT 'VENDOR',
  ADD COLUMN IF NOT EXISTS "user_id" VARCHAR(255) REFERENCES "users"("id") ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "rules" TEXT,
  ADD COLUMN IF NOT EXISTS "banner_url" TEXT;

ALTER TABLE "tournaments"
  ALTER COLUMN "turf_id" DROP NOT NULL,
  ALTER COLUMN "vendor_id" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_tournaments_creator_status" ON "tournaments"("creator_type", "status");
CREATE INDEX IF NOT EXISTS "idx_tournaments_user_status" ON "tournaments"("user_id", "status");

COMMIT;
