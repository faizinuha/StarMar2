
-- 1. User Keys for E2E Encryption
CREATE TABLE public.user_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  public_key text NOT NULL,
  key_type text NOT NULL DEFAULT 'ECDH-P256',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public keys" ON public.user_keys
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own key" ON public.user_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own key" ON public.user_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. Group Roles
CREATE TABLE public.group_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.group_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group roles" ON public.group_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = group_roles.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can insert roles" ON public.group_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = group_roles.conversation_id
      AND c.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM group_roles gr
      WHERE gr.conversation_id = group_roles.conversation_id
      AND gr.user_id = auth.uid()
      AND gr.role = 'admin'
    )
  );

CREATE POLICY "Group admins can update roles" ON public.group_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = group_roles.conversation_id
      AND c.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM group_roles gr
      WHERE gr.conversation_id = group_roles.conversation_id
      AND gr.user_id = auth.uid()
      AND gr.role = 'admin'
    )
  );

CREATE POLICY "Group admins can delete roles" ON public.group_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = group_roles.conversation_id
      AND c.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM group_roles gr
      WHERE gr.conversation_id = group_roles.conversation_id
      AND gr.user_id = auth.uid()
      AND gr.role = 'admin'
    )
  );

-- 3. Add chat_mode to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS chat_mode text DEFAULT 'open';

-- 4. Call Sessions (create BEFORE call_participants)
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL,
  call_type text NOT NULL DEFAULT 'video',
  status text NOT NULL DEFAULT 'ringing',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Call Participants
CREATE TABLE public.call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'invited',
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

-- 6. Call Signals
CREATE TABLE public.call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  signal_type text NOT NULL,
  signal_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- Now add RLS for call_sessions (call_participants exists now)
CREATE POLICY "Participants can view call sessions" ON public.call_sessions
  FOR SELECT USING (
    caller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM call_participants cp
      WHERE cp.session_id = call_sessions.id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = call_sessions.conversation_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Auth users can create calls" ON public.call_sessions
  FOR INSERT WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Members can update call" ON public.call_sessions
  FOR UPDATE USING (
    caller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = call_sessions.conversation_id AND cm.user_id = auth.uid()
    )
  );

-- RLS for call_participants
CREATE POLICY "Users can view their participations" ON public.call_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM call_sessions cs
      WHERE cs.id = call_participants.session_id AND cs.caller_id = auth.uid()
    )
  );

CREATE POLICY "Auth users can insert participants" ON public.call_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM call_sessions cs
      WHERE cs.id = call_participants.session_id
      AND (cs.caller_id = auth.uid() OR call_participants.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own participation" ON public.call_participants
  FOR UPDATE USING (user_id = auth.uid());

-- RLS for call_signals
CREATE POLICY "Users can view signals for them" ON public.call_signals
  FOR SELECT USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

CREATE POLICY "Auth users can send signals" ON public.call_signals
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can delete their signals" ON public.call_signals
  FOR DELETE USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
