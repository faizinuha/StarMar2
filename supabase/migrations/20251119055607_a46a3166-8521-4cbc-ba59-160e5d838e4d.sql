-- Add parent_message_id to messages for reply feature
ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES messages(id) ON DELETE SET NULL;

-- Create favorite_conversations table
CREATE TABLE IF NOT EXISTS favorite_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

-- Create favorite_users table
CREATE TABLE IF NOT EXISTS favorite_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  favorite_user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, favorite_user_id)
);

-- Enable RLS
ALTER TABLE favorite_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for favorite_conversations
CREATE POLICY "Users can view their own favorite conversations"
  ON favorite_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorite conversations"
  ON favorite_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorite conversations"
  ON favorite_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for favorite_users
CREATE POLICY "Users can view their own favorite users"
  ON favorite_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorite users"
  ON favorite_users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorite users"
  ON favorite_users FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_favorite_conversations_user ON favorite_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_users_user ON favorite_users(user_id);