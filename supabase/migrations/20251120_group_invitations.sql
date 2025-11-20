-- Create group_invitations table for tracking group invites and member acceptance
CREATE TABLE IF NOT EXISTS public.group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, declined, expired
  created_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  UNIQUE(conversation_id, invited_user_id)
);

-- Enable RLS
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_invitations
-- Users can view invitations sent to them
CREATE POLICY "Users can view invitations sent to them"
  ON public.group_invitations FOR SELECT
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);

-- Group admin can view all invitations for their group
CREATE POLICY "Group admin can view invitations for their group"
  ON public.group_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = group_invitations.conversation_id
      AND conversations.created_by = auth.uid()
    )
  );

-- Users can create invitations for groups they are admin of
CREATE POLICY "Group admin can create invitations"
  ON public.group_invitations FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = group_invitations.conversation_id
      AND conversations.created_by = auth.uid()
    )
  );

-- Users can update their own invitation responses
CREATE POLICY "Users can update their own invitation status"
  ON public.group_invitations FOR UPDATE
  USING (auth.uid() = invited_user_id)
  WITH CHECK (auth.uid() = invited_user_id);

-- Group admin can delete expired invitations
CREATE POLICY "Group admin can delete invitations"
  ON public.group_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = group_invitations.conversation_id
      AND conversations.created_by = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_group_invitations_user ON public.group_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_conversation ON public.group_invitations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON public.group_invitations(status);
