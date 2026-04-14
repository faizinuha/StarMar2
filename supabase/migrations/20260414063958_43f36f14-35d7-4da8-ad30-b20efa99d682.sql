-- Fix bookmark FK: user_id should reference profiles.user_id, not profiles.id
ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;

ALTER TABLE public.bookmarks
  ADD CONSTRAINT bookmarks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Also fix the default on post_id (it was incorrectly set to auth.uid())
ALTER TABLE public.bookmarks ALTER COLUMN post_id DROP DEFAULT;

-- Update INSERT policy to be more secure
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.bookmarks;
CREATE POLICY "Users can create own bookmarks" ON public.bookmarks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Clean up duplicate SELECT policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.bookmarks;
DROP POLICY IF EXISTS "ALl" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Fix DELETE policy
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);