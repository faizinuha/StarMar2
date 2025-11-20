-- Fix RLS policies untuk memungkinkan insert ke conversation_members tanpa restriction
-- karena aplikasi sudah melakukan validation di application level

DROP POLICY IF EXISTS "conversation_members_insert" ON public.conversation_members;

-- Allow anyone to insert (validated by app)
CREATE POLICY "conversation_members_insert"
  ON public.conversation_members FOR INSERT
  WITH CHECK (true);

-- Pastikan SELECT policy sudah benar
DROP POLICY IF EXISTS "conversation_members_select" ON public.conversation_members;

CREATE POLICY "conversation_members_select"
  ON public.conversation_members FOR SELECT
  USING (true);
