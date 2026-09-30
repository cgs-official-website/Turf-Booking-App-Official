-- 002_create_entities.sql
-- Additive migration for Vendors, Turfs, Users, WishlistItems, DeviceTokens, and SuperAdmins.
-- Preserves existing documents, bookings, and slot_overrides tables.

BEGIN;

-- 1. Create Enums
CREATE TYPE "kyc_status" AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE "turf_status" AS ENUM ('active', 'inactive', 'pending', 'suspended');
CREATE TYPE "user_status" AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE "admin_role" AS ENUM ('admin', 'superadmin');

-- 2. CreateTable: vendors
CREATE TABLE "vendors" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(32),
    "password_hash" VARCHAR(255) NOT NULL,
    "kyc_status" "kyc_status" NOT NULL DEFAULT 'pending',
    "subscription" JSONB,
    "turf_onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "turf_approval_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- 3. CreateTable: turfs
CREATE TABLE "turfs" (
    "id" VARCHAR(255) NOT NULL,
    "vendor_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sports" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "price_per_hour" DECIMAL(10,2) NOT NULL,
    "court_count" INTEGER NOT NULL DEFAULT 1,
    "location" JSONB,
    "city" VARCHAR(128) NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "slot_config" JSONB,
    "logo" TEXT,
    "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "status" "turf_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turfs_pkey" PRIMARY KEY ("id")
);

-- 4. CreateTable: users
CREATE TABLE "users" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(32),
    "password_hash" VARCHAR(255),
    "avatar" TEXT,
    "location" JSONB,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- 5. CreateTable: wishlist_items
CREATE TABLE "wishlist_items" (
    "user_id" VARCHAR(255) NOT NULL,
    "turf_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("user_id","turf_id")
);

-- 6. CreateTable: device_tokens
CREATE TABLE "device_tokens" (
    "id" VARCHAR(255) NOT NULL,
    "owner_type" VARCHAR(32) NOT NULL,
    "owner_id" VARCHAR(255) NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- 7. CreateTable: superadmins
CREATE TABLE "superadmins" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "admin_role" NOT NULL DEFAULT 'admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "superadmins_pkey" PRIMARY KEY ("id")
);

-- 8. Indexes
CREATE UNIQUE INDEX "vendors_email_key" ON "vendors"("email");

CREATE INDEX "turfs_vendor_id_idx" ON "turfs"("vendor_id");
CREATE INDEX "turfs_city_idx" ON "turfs"("city");
CREATE INDEX "turfs_status_idx" ON "turfs"("status");

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

CREATE INDEX "wishlist_items_turf_id_idx" ON "wishlist_items"("turf_id");

CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");
CREATE INDEX "device_tokens_owner_type_owner_id_idx" ON "device_tokens"("owner_type", "owner_id");

CREATE UNIQUE INDEX "superadmins_email_key" ON "superadmins"("email");

-- 9. Foreign Keys
ALTER TABLE "turfs" ADD CONSTRAINT "turfs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_turf_id_fkey" FOREIGN KEY ("turf_id") REFERENCES "turfs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
