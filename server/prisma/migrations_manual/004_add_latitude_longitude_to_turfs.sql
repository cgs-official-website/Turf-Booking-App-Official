-- Add latitude and longitude columns to turfs table without altering existing columns
ALTER TABLE "turfs" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "turfs" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- Sync values from lat, lng and location JSON where available
UPDATE "turfs"
SET "latitude" = COALESCE("latitude", "lat", ("location"->>'lat')::DOUBLE PRECISION, ("location"->>'latitude')::DOUBLE PRECISION),
    "longitude" = COALESCE("longitude", "lng", ("location"->>'lng')::DOUBLE PRECISION, ("location"->>'longitude')::DOUBLE PRECISION);
