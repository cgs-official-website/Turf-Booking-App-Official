-- Rollback latitude and longitude columns
ALTER TABLE "turfs" DROP COLUMN IF EXISTS "latitude";
ALTER TABLE "turfs" DROP COLUMN IF EXISTS "longitude";
