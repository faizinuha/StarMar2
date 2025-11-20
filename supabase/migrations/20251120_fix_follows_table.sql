-- Buat tabel followers jika belum ada
-- Tabel ini menyimpan data siapa yang follow siapa

CREATE TABLE IF NOT EXISTS public.followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Drop old policies jika ada untuk menghindari konflikt
DROP POLICY IF EXISTS "Users can view all follows" ON public.followers;
DROP POLICY IF EXISTS "Users can create follow requests" ON public.followers;
DROP POLICY IF EXISTS "Users can update their own follow status" ON public.followers;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.followers;

-- RLS Policies untuk tabel followers
-- User dapat melihat semua followers
CREATE POLICY "Users can view all follows"
  ON public.followers FOR SELECT
  USING (true);

-- User dapat membuat follow requests
CREATE POLICY "Users can create follow requests"
  ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- User dapat update follow mereka sendiri
CREATE POLICY "Users can update their own follows"
  ON public.followers FOR UPDATE
  USING (auth.uid() = follower_id OR auth.uid() = following_id)
  WITH CHECK (auth.uid() = follower_id OR auth.uid() = following_id);

-- User dapat delete follow mereka sendiri
CREATE POLICY "Users can delete their own follows"
  ON public.followers FOR DELETE
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Buat index untuk performa lebih baik
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers(following_id);


