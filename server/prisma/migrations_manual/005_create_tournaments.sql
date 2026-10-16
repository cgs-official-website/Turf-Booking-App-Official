-- Migration 005: Ensure Complete Tournaments Table Schema
-- Supports Super Admin, Vendor App, and User App Tournament functionality

BEGIN;

-- If table does not exist, create it
CREATE TABLE IF NOT EXISTS "tournaments" (
  "id" VARCHAR(255) PRIMARY KEY,
  "turf_id" VARCHAR(255) REFERENCES "turfs"("id") ON DELETE SET NULL,
  "vendor_id" VARCHAR(255) REFERENCES "vendors"("id") ON DELETE SET NULL,
  "name" VARCHAR(255) NOT NULL,
  "sport" VARCHAR(64) NOT NULL,
  "start_date" VARCHAR(32) NOT NULL,
  "end_date" VARCHAR(32) NOT NULL,
  "number_of_teams" INTEGER,
  "players_per_team" INTEGER,
  "overs_per_team" INTEGER,
  "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "shareable_identifier" VARCHAR(255),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Make legacy columns nullable if they had NOT NULL
ALTER TABLE "tournaments" ALTER COLUMN "turf_id" DROP NOT NULL;
ALTER TABLE "tournaments" ALTER COLUMN "vendor_id" DROP NOT NULL;
ALTER TABLE "tournaments" ALTER COLUMN "shareable_identifier" DROP NOT NULL;
ALTER TABLE "tournaments" ALTER COLUMN "number_of_teams" DROP NOT NULL;
ALTER TABLE "tournaments" ALTER COLUMN "players_per_team" DROP NOT NULL;

-- Add all required tournament fields (safe idempotent ADD COLUMN IF NOT EXISTS)
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "venue_name" VARCHAR(255);
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "city" VARCHAR(128);
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "venue_location" JSONB;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "registration_start_date" VARCHAR(32);
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "registration_end_date" VARCHAR(32);
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "entry_fee" DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "prize_pool" DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "prize_details" JSONB;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "participant_capacity" INTEGER NOT NULL DEFAULT 16;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "format" VARCHAR(64) NOT NULL DEFAULT 'knockout';
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "rules" TEXT;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "banner_url" TEXT;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "current_participants_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "contact_phone" VARCHAR(32);
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "contact_email" VARCHAR(255);
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS "idx_tournaments_status" ON "tournaments"("status");
CREATE INDEX IF NOT EXISTS "idx_tournaments_sport" ON "tournaments"("sport");
CREATE INDEX IF NOT EXISTS "idx_tournaments_turf_id" ON "tournaments"("turf_id");
CREATE INDEX IF NOT EXISTS "idx_tournaments_dates" ON "tournaments"("start_date", "end_date");
CREATE INDEX IF NOT EXISTS "idx_tournaments_turf_status" ON "tournaments"("turf_id", "status");
CREATE INDEX IF NOT EXISTS "idx_tournaments_vendor_status" ON "tournaments"("vendor_id", "status");
CREATE INDEX IF NOT EXISTS "idx_tournaments_shareable_identifier" ON "tournaments"("shareable_identifier");

COMMIT;
