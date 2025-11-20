-- Fix RLS policies to prevent 500 errors while maintaining security
-- The enhanced policies were too complex and causing timeouts

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view conversations they are members of" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they are admin of" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete conversations they are admin of" ON public.conversations;
DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Group admin can add members" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can remove themselves or admin can remove" ON public.conversation_members;

-- Create simpler, more performant RLS policies for conversations
-- Users can view conversations they are members of (simpler check via JOIN to members table)
CREATE POLICY "conversations_select_policy"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversations.id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can create conversations (groups only - DMs created via RPC)
CREATE POLICY "conversations_insert_policy"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Admins can update conversations
CREATE POLICY "conversations_update_policy"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Admins can delete groups, anyone can delete their own DM
CREATE POLICY "conversations_delete_policy"
  ON public.conversations FOR DELETE
  USING (
    auth.uid() = created_by OR
    (
      NOT is_group AND
      EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = conversations.id
        AND user_id = auth.uid()
      )
    )
  );

-- Create simpler RLS policies for conversation_members
-- Users can view members of conversations they're part of
CREATE POLICY "members_select_policy"
  ON public.conversation_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

-- Group admins can insert members
CREATE POLICY "members_insert_policy"
  ON public.conversation_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_members.conversation_id
      AND c.created_by = auth.uid()
      AND c.is_group = true
    )
  );

-- Users can remove themselves or be removed by admin
CREATE POLICY "members_delete_policy"
  ON public.conversation_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_members.conversation_id
      AND c.created_by = auth.uid()
      AND c.is_group = true
    )
  );

-- Add indexes if not exist
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_is_group ON public.conversations(is_group);

-- Ensure messages table has proper RLS
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;

-- Users can view messages from conversations they're part of
CREATE POLICY "messages_select_policy"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can send messages to conversations they're part of
CREATE POLICY "messages_insert_policy"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can delete their own messages
CREATE POLICY "messages_delete_policy"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Create index for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
