-- ============================================================
-- Announcements Inbox Migration
-- Run this in your Supabase SQL Editor (or via supabase db push)
-- ============================================================

-- 1. Add target_roles column to announcements
--    Default: all four roles so existing announcements remain visible to everyone.
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS target_roles TEXT[] NOT NULL DEFAULT ARRAY['parishioner','staff','priest','ministry'];

-- 2. Create announcement_reads tracking table
CREATE TABLE IF NOT EXISTS announcement_reads (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id  UUID        NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  is_dismissed     BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- 3. Enable Row Level Security
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: each user can only see / manage their own read records
CREATE POLICY "Users manage their own reads"
  ON announcement_reads
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
