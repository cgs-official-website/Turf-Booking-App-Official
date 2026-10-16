-- Migration 007: Tournament Teams and Player Rosters
-- Adds JSONB teams column to existing tournaments table to store team rosters & players

BEGIN;

ALTER TABLE "tournaments" 
  ADD COLUMN IF NOT EXISTS "teams" JSONB DEFAULT '[]'::jsonb;

COMMIT;
