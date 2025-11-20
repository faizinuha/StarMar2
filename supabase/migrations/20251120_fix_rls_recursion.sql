-- Fix infinite recursion in RLS policies
-- Drop semua policies yang bermasalah

-- Drop policies dari conversation_members
DROP POLICY IF EXISTS "members_select_policy" ON public.conversation_members;
DROP POLICY IF EXISTS "members_insert_policy" ON public.conversation_members;
DROP POLICY IF EXISTS "members_delete_policy" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can add members to conversations they created" ON public.conversation_members;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.conversation_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.conversation_members;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.conversation_members;

-- Drop policies dari messages
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;

-- Drop policies dari conversations
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete_policy" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they are members of" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they are admin of" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete conversations they are admin of" ON public.conversations;

-- ===== BUAT POLICIES BARU YANG SEDERHANA (TANPA RECURSION) =====

-- CONVERSATION_MEMBERS policies (simple - tanpa nested queries)
CREATE POLICY "conversation_members_select"
  ON public.conversation_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "conversation_members_insert"
  ON public.conversation_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "conversation_members_update"
  ON public.conversation_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversation_members_delete"
  ON public.conversation_members FOR DELETE
  USING (auth.uid() = user_id);

-- MESSAGES policies (simple - tanpa nested queries ke conversation_members)
CREATE POLICY "messages_select"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "messages_insert"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_delete"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- CONVERSATIONS policies (simple)
CREATE POLICY "conversations_select"
  ON public.conversations FOR SELECT
  USING (true);

CREATE POLICY "conversations_insert"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "conversations_update"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "conversations_delete"
  ON public.conversations FOR DELETE
  USING (auth.uid() = created_by);

-- PROFILES policies (allow all reads)
DROP POLICY IF EXISTS "profile_select" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access to all profiles" ON public.profiles;

CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  USING (true);

-- FOLLOWERS policies
DROP POLICY IF EXISTS "Users can view all follows" ON public.followers;
DROP POLICY IF EXISTS "Users can create follow requests" ON public.followers;
DROP POLICY IF EXISTS "Users can update their own follows" ON public.followers;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.followers;

CREATE POLICY "followers_select"
  ON public.followers FOR SELECT
  USING (true);

CREATE POLICY "followers_insert"
  ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "followers_delete"
  ON public.followers FOR DELETE
  USING (auth.uid() = follower_id OR auth.uid() = following_id);
