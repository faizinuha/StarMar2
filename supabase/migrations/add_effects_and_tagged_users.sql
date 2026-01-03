-- Migration: Add effects and tagged users support
-- This migration adds support for:
-- 1. Caption and location fields for stories
-- 2. Post tagged users relationship table

-- Add columns to stories table untuk caption dan location
-- These columns are optional and nullable
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS caption TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Create table untuk post_tagged_users relationship
-- This tracks which users are mentioned/tagged in a post
CREATE TABLE IF NOT EXISTS post_tagged_users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, tagged_user_id)
);

-- Create indexes untuk performance optimization
CREATE INDEX IF NOT EXISTS idx_post_tagged_users_post_id ON post_tagged_users(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tagged_users_tagged_user_id ON post_tagged_users(tagged_user_id);

-- Enable Row Level Security (RLS) untuk keamanan
ALTER TABLE post_tagged_users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read tagged users (public data)
CREATE POLICY "Enable read access for all" ON post_tagged_users
  FOR SELECT USING (true);

-- RLS Policy: Only authenticated users can insert
CREATE POLICY "Enable insert for authenticated users" ON post_tagged_users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Only post owner can delete tagged users
CREATE POLICY "Enable delete for post owner" ON post_tagged_users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_tagged_users.post_id 
      AND posts.user_id = auth.uid()
    )
  );

