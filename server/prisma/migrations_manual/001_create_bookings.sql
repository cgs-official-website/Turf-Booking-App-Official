-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('reserved', 'pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'success', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "bookings" (
    "booking_id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "vendor_id" VARCHAR(255) NOT NULL,
    "turf_id" VARCHAR(255) NOT NULL,
    "slot_id" VARCHAR(255),
    "booking_date" DATE NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "booking_status" "booking_status" NOT NULL DEFAULT 'pending',
    "payment_status" "payment_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "court_number" INTEGER NOT NULL DEFAULT 1,
    "sport" VARCHAR(64),
    "payment_method" VARCHAR(16),
    "razorpay_order_id" VARCHAR(64),
    "razorpay_payment_id" VARCHAR(64),
    "hold_expires_at" TIMESTAMPTZ(6),
    "requested_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "cancellation_reason" TEXT,
    "is_reviewed" BOOLEAN NOT NULL DEFAULT false,
    "review_id" VARCHAR(255),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("booking_id")
);

-- CreateIndex
CREATE INDEX "bookings_user_id_created_at_idx" ON "bookings"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "bookings_vendor_id_booking_status_created_at_idx" ON "bookings"("vendor_id", "booking_status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "bookings_turf_id_booking_date_start_time_idx" ON "bookings"("turf_id", "booking_date", "start_time");

-- CreateIndex
CREATE INDEX "bookings_razorpay_order_id_idx" ON "bookings"("razorpay_order_id");

-- Partial Unique Index (active slot concurrency constraint)
CREATE UNIQUE INDEX "bookings_active_slot_key"
  ON "bookings"("turf_id","court_number","booking_date","start_time")
  WHERE "booking_status" IN ('reserved','pending','confirmed');
