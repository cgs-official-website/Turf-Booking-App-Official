-- Migration 007: Tournament Registrations & Team Applications
-- Tracks team registrations for vendor or user tournaments

BEGIN;

CREATE TABLE IF NOT EXISTS "tournament_registrations" (
  "id" VARCHAR(255) PRIMARY KEY,
  "tournament_id" VARCHAR(255) NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "team_name" VARCHAR(255) NOT NULL,
  "captain_name" VARCHAR(255) NOT NULL,
  "captain_phone" VARCHAR(32) NOT NULL,
  "captain_email" VARCHAR(255),
  "players" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
  "rejection_reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uq_tournament_user_registration" UNIQUE ("tournament_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_tournament_registrations_tournament_status" 
  ON "tournament_registrations"("tournament_id", "status");

CREATE INDEX IF NOT EXISTS "idx_tournament_registrations_user" 
  ON "tournament_registrations"("user_id");

COMMIT;
