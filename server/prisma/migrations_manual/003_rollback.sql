-- Migration 003 Rollback Script
-- Drops tables, enums, and columns introduced in Migration 003 in reverse dependency order.
-- NOTE: In PostgreSQL, enum values (such as 'rejected' added to 'turf_status') cannot be dropped
-- without recreating the enum type; leaving the enum value intact is completely harmless.

BEGIN;

-- 1. Drop tables in reverse dependency order
DROP TABLE IF EXISTS "match_players" CASCADE;
DROP TABLE IF EXISTS "matches" CASCADE;
DROP TABLE IF EXISTS "reports" CASCADE;
DROP TABLE IF EXISTS "otp_codes" CASCADE;
DROP TABLE IF EXISTS "vendor_kyc_documents" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "payments" CASCADE;
DROP TABLE IF EXISTS "vendor_subscriptions" CASCADE;
DROP TABLE IF EXISTS "subscription_plans" CASCADE;
DROP TABLE IF EXISTS "reviews" CASCADE;

-- 2. Drop Migration 003 enums
DROP TYPE IF EXISTS "report_status";
DROP TYPE IF EXISTS "match_status";
DROP TYPE IF EXISTS "otp_role";
DROP TYPE IF EXISTS "otp_purpose";
DROP TYPE IF EXISTS "otp_identifier_type";
DROP TYPE IF EXISTS "kyc_doc_status";
DROP TYPE IF EXISTS "kyc_doc_type";
DROP TYPE IF EXISTS "notification_type";
DROP TYPE IF EXISTS "notification_recipient_type";
DROP TYPE IF EXISTS "payment_record_status";
DROP TYPE IF EXISTS "payment_purpose";
DROP TYPE IF EXISTS "vendor_subscription_status";

-- 3. Drop columns added to existing tables in Migration 003
ALTER TABLE "vendors" 
  DROP COLUMN IF EXISTS "rejection_reason",
  DROP COLUMN IF EXISTS "reviewed_at";

ALTER TABLE "turfs" 
  DROP COLUMN IF EXISTS "rejection_reason",
  DROP COLUMN IF EXISTS "reviewed_at";

COMMIT;
