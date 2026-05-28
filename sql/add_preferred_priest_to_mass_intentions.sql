-- ============================================================
-- Add preferred_priest column to general request tables
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (IF NOT EXISTS guard)
-- ============================================================

ALTER TABLE mass_intentions
  ADD COLUMN IF NOT EXISTS preferred_priest TEXT;

ALTER TABLE facilities_bookings
  ADD COLUMN IF NOT EXISTS preferred_priest TEXT;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS preferred_priest TEXT;
