-- Enhanced RLS Policies for better group management

-- DROP existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view conversations they are members of" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they are members of" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete conversations they are members of" ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated users to select" ON public.conversation_members;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.conversation_members;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON public.conversation_members;

-- RLS Policies for conversations table
-- Users can view conversations they are members of
CREATE POLICY "Users can view conversations they are members of"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_members.conversation_id = conversations.id
      AND conversation_members.user_id = auth.uid()
    )
  );

-- Users can create conversations (groups or direct)
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update conversations if they are admin
CREATE POLICY "Users can update conversations they are admin of"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Users/Admin can delete conversations they are admin of (for groups) or members of (for DM)
CREATE POLICY "Users can delete conversations they are admin of"
  ON public.conversations FOR DELETE
  USING (
    auth.uid() = created_by OR
    (
      NOT is_group AND
      EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_members.conversation_id = conversations.id
        AND conversation_members.user_id = auth.uid()
      )
    )
  );

-- RLS Policies for conversation_members table
-- Users can view members of conversations they are part of
CREATE POLICY "Users can view members of their conversations"
  ON public.conversation_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_members AS cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can add members if they are admin of group
CREATE POLICY "Group admin can add members"
  ON public.conversation_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_members.conversation_id
      AND conversations.created_by = auth.uid()
      AND conversations.is_group = true
    )
  );

-- Users can remove themselves or be removed by admin
CREATE POLICY "Users can remove themselves or admin can remove"
  ON public.conversation_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_members.conversation_id
      AND conversations.created_by = auth.uid()
      AND conversations.is_group = true
    )
  );

-- Add created_by to conversation_members for tracking
ALTER TABLE public.conversation_members 
ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_is_group ON public.conversations(is_group);
