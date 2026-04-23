-- Migration: Bracket support
-- Run this in Supabase SQL editor before using the bracket feature

-- 1. Allow null home/away teams (needed for future-round bracket matches)
ALTER TABLE matches ALTER COLUMN home_team_id DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN away_team_id DROP NOT NULL;

-- 2. Add bracket_position to track match slot within a round
ALTER TABLE matches ADD COLUMN IF NOT EXISTS bracket_position integer;
