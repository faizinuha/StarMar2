-- Ensure avatar_url column exists for conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment
COMMENT ON COLUMN conversations.avatar_url IS 'Avatar URL untuk grup chat, null untuk DM';
