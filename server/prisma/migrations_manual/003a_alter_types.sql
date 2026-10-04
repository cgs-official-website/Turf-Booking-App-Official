-- Migration 003a: Alter Enums
-- Note: PostgreSQL requires ALTER TYPE ... ADD VALUE to be executed outside of a multi-statement transaction block.
ALTER TYPE turf_status ADD VALUE IF NOT EXISTS 'rejected';
