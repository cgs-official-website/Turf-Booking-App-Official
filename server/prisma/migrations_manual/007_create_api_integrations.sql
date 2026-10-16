-- Migration 007: Create API Integrations Table
-- Stores dynamic credentials, status, and metadata for MSG91, Cloudinary, Razorpay

CREATE TABLE IF NOT EXISTS public.api_integrations (
  provider VARCHAR(64) PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) DEFAULT 'not_configured',
  last_test_at TIMESTAMPTZ,
  last_error TEXT,
  last_success_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_integrations_status ON public.api_integrations(status);
