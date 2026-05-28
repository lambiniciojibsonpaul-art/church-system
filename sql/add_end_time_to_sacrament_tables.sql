-- ============================================================
-- Add end_time column to sacrament/service request tables
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (IF NOT EXISTS guard)
-- ============================================================

ALTER TABLE baptisms
  ADD COLUMN IF NOT EXISTS end_time TEXT;

ALTER TABLE holy_communions
  ADD COLUMN IF NOT EXISTS end_time TEXT;

ALTER TABLE confirmations
  ADD COLUMN IF NOT EXISTS end_time TEXT;

ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS end_time TEXT;

ALTER TABLE sacraments_liturgical
  ADD COLUMN IF NOT EXISTS end_time TEXT;
