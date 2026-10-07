-- 002_rollback.sql
-- Reverses 002_create_entities.sql safely.

DROP TABLE IF EXISTS "wishlist_items";
DROP TABLE IF EXISTS "device_tokens";
DROP TABLE IF EXISTS "turfs";
DROP TABLE IF EXISTS "vendors";
DROP TABLE IF EXISTS "users";
DROP TABLE IF EXISTS "superadmins";

DROP TYPE IF EXISTS "admin_role";
DROP TYPE IF EXISTS "user_status";
DROP TYPE IF EXISTS "turf_status";
DROP TYPE IF EXISTS "kyc_status";
