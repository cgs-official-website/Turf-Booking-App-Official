-- Migration 003b: Create Remaining Entities (Relational Schema Extension)
-- Wrap entire migration in a transaction for atomicity and safety

BEGIN;

-- -------------------------------------------------------------
-- 0. Create Enums for New Entities
-- -------------------------------------------------------------

CREATE TYPE "vendor_subscription_status" AS ENUM ('created', 'active', 'expired', 'cancelled');
CREATE TYPE "payment_purpose" AS ENUM ('booking', 'vendor_subscription');
CREATE TYPE "payment_record_status" AS ENUM ('created', 'captured', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE "notification_recipient_type" AS ENUM ('user', 'vendor', 'admin');
CREATE TYPE "notification_type" AS ENUM ('general', 'booking', 'kyc', 'match');
CREATE TYPE "kyc_doc_type" AS ENUM ('aadhaar', 'pan', 'gst', 'eb_bill');
CREATE TYPE "kyc_doc_status" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "otp_identifier_type" AS ENUM ('phone', 'email');
CREATE TYPE "otp_purpose" AS ENUM ('login', 'register', 'reset');
CREATE TYPE "otp_role" AS ENUM ('user', 'vendor');
CREATE TYPE "match_status" AS ENUM ('created', 'live', 'completed');
CREATE TYPE "report_status" AS ENUM ('open', 'in_progress', 'resolved');

-- -------------------------------------------------------------
-- 1. Alter Existing Tables (Additive Columns Only)
-- -------------------------------------------------------------

ALTER TABLE "vendors" 
  ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(6);

ALTER TABLE "turfs" 
  ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(6);

-- -------------------------------------------------------------
-- 2. Reviews Table
-- -------------------------------------------------------------

CREATE TABLE "reviews" (
  "id" VARCHAR(255) PRIMARY KEY,
  "booking_id" VARCHAR(255) NOT NULL UNIQUE,
  "turf_id" VARCHAR(255) NOT NULL REFERENCES "turfs"("id") ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "user_name" VARCHAR(255) NOT NULL,
  "user_photo" TEXT,
  "rating" INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  "comment" TEXT,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_reviews_turf_id" ON "reviews"("turf_id");
CREATE INDEX "idx_reviews_turf_id_hidden" ON "reviews"("turf_id", "hidden");
CREATE INDEX "idx_reviews_user_id" ON "reviews"("user_id");

-- -------------------------------------------------------------
-- 3. Subscription Plans Table
-- -------------------------------------------------------------

CREATE TABLE "subscription_plans" (
  "id" VARCHAR(255) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10, 2) NOT NULL,
  "duration_days" INTEGER NOT NULL,
  "features" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "popular" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- 4. Vendor Subscriptions Table
-- -------------------------------------------------------------

CREATE TABLE "vendor_subscriptions" (
  "id" VARCHAR(255) PRIMARY KEY,
  "vendor_id" VARCHAR(255) NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "plan_id" VARCHAR(255) NOT NULL REFERENCES "subscription_plans"("id") ON DELETE RESTRICT,
  "plan_name" VARCHAR(255) NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "duration_days" INTEGER NOT NULL,
  "status" "vendor_subscription_status" NOT NULL DEFAULT 'created',
  "razorpay_order_id" VARCHAR(255),
  "razorpay_payment_id" VARCHAR(255),
  "starts_at" TIMESTAMPTZ(6),
  "expires_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_vendor_subscriptions_vendor_status" ON "vendor_subscriptions"("vendor_id", "status");
CREATE INDEX "idx_vendor_subscriptions_expires_at" ON "vendor_subscriptions"("expires_at");
CREATE UNIQUE INDEX "uq_vendor_subscriptions_razorpay_order" ON "vendor_subscriptions"("razorpay_order_id") WHERE "razorpay_order_id" IS NOT NULL;

-- -------------------------------------------------------------
-- 5. Payments Table
-- -------------------------------------------------------------

CREATE TABLE "payments" (
  "id" VARCHAR(255) PRIMARY KEY,
  "purpose" "payment_purpose" NOT NULL,
  "booking_id" VARCHAR(255) REFERENCES "bookings"("booking_id") ON DELETE RESTRICT,
  "vendor_subscription_id" VARCHAR(255) REFERENCES "vendor_subscriptions"("id") ON DELETE SET NULL,
  "user_id" VARCHAR(255),
  "vendor_id" VARCHAR(255),
  "razorpay_order_id" VARCHAR(255) NOT NULL UNIQUE,
  "razorpay_payment_id" VARCHAR(255) UNIQUE,
  "amount" DECIMAL(10, 2) NOT NULL,
  "currency" VARCHAR(16) NOT NULL DEFAULT 'INR',
  "status" "payment_record_status" NOT NULL DEFAULT 'created',
  "refund_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  "raw_payload" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chk_payments_purpose_reference" CHECK (
    (purpose = 'booking' AND booking_id IS NOT NULL AND vendor_subscription_id IS NULL) OR
    (purpose = 'vendor_subscription' AND vendor_subscription_id IS NOT NULL AND booking_id IS NULL)
  )
);

CREATE INDEX "idx_payments_booking_id" ON "payments"("booking_id");
CREATE INDEX "idx_payments_vendor_sub_id" ON "payments"("vendor_subscription_id");
CREATE INDEX "idx_payments_user_id" ON "payments"("user_id");
CREATE INDEX "idx_payments_vendor_id" ON "payments"("vendor_id");
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- -------------------------------------------------------------
-- 6. Notifications Table
-- -------------------------------------------------------------

CREATE TABLE "notifications" (
  "id" VARCHAR(255) PRIMARY KEY,
  "recipient_type" "notification_recipient_type" NOT NULL,
  "recipient_id" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "body" TEXT NOT NULL,
  "type" "notification_type" NOT NULL DEFAULT 'general',
  "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_notifications_recipient_read_created" ON "notifications"("recipient_type", "recipient_id", "is_read", "created_at" DESC);

-- -------------------------------------------------------------
-- 7. Vendor KYC Documents Table
-- -------------------------------------------------------------

CREATE TABLE "vendor_kyc_documents" (
  "id" VARCHAR(255) PRIMARY KEY,
  "vendor_id" VARCHAR(255) NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "doc_type" "kyc_doc_type" NOT NULL,
  "file_url" TEXT NOT NULL,
  "status" "kyc_doc_status" NOT NULL DEFAULT 'pending',
  "rejection_reason" TEXT,
  "reviewed_by" VARCHAR(255) REFERENCES "superadmins"("id") ON DELETE SET NULL,
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uq_vendor_kyc_vendor_doctype" UNIQUE ("vendor_id", "doc_type")
);

CREATE INDEX "idx_vendor_kyc_status" ON "vendor_kyc_documents"("status");
CREATE INDEX "idx_vendor_kyc_vendor_id" ON "vendor_kyc_documents"("vendor_id");

-- -------------------------------------------------------------
-- 8. OTP Codes Table
-- -------------------------------------------------------------

CREATE TABLE "otp_codes" (
  "id" VARCHAR(255) PRIMARY KEY,
  "identifier" VARCHAR(255) NOT NULL,
  "identifier_type" "otp_identifier_type" NOT NULL,
  "otp_hash" VARCHAR(255) NOT NULL,
  "purpose" "otp_purpose" NOT NULL,
  "role" "otp_role" NOT NULL DEFAULT 'user',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uq_otp_identifier_purpose" UNIQUE ("identifier", "purpose")
);

CREATE INDEX "idx_otp_expires_at" ON "otp_codes"("expires_at");

-- -------------------------------------------------------------
-- 9. Matches and Match Players Tables
-- -------------------------------------------------------------

CREATE TABLE "matches" (
  "id" VARCHAR(255) PRIMARY KEY,
  "created_by" VARCHAR(255) NOT NULL,
  "creator_name" VARCHAR(255) NOT NULL,
  "join_code" VARCHAR(6) NOT NULL UNIQUE,
  "place" VARCHAR(255) NOT NULL,
  "sport" VARCHAR(64) NOT NULL,
  "match_date" TEXT NOT NULL,
  "match_time" TEXT NOT NULL,
  "play_with_strangers" BOOLEAN NOT NULL DEFAULT false,
  "turf_id" VARCHAR(255) REFERENCES "turfs"("id") ON DELETE SET NULL,
  "booking_id" VARCHAR(255),
  "teams" JSONB NOT NULL DEFAULT '{"teamA":{"name":"Team A","players":[]},"teamB":{"name":"Team B","players":[]}}'::jsonb,
  "toss" JSONB,
  "scorecard" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "match_status" NOT NULL DEFAULT 'created',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_matches_created_by" ON "matches"("created_by");
CREATE INDEX "idx_matches_status" ON "matches"("status");

CREATE TABLE "match_players" (
  "match_id" VARCHAR(255) NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("match_id", "user_id")
);

CREATE INDEX "idx_match_players_user_id" ON "match_players"("user_id");

-- -------------------------------------------------------------
-- 10. Reports Table
-- -------------------------------------------------------------

CREATE TABLE "reports" (
  "id" VARCHAR(255) PRIMARY KEY,
  "vendor_id" VARCHAR(255) NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "issue_type" VARCHAR(128) NOT NULL,
  "description" TEXT NOT NULL,
  "status" "report_status" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_reports_vendor_status" ON "reports"("vendor_id", "status");

COMMIT;
