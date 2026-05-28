-- ============================================================
-- Add end_time column to events table
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (IF NOT EXISTS guard)
-- ============================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS end_time TEXT;
