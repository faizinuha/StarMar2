-- Tambah kolom avatar_url untuk grup di tabel conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update RLS conversations: user bisa update avatar_url untuk grup yg dia buat
-- (policy 'Users can update conversations they are members of' sudah ada, 
--  jadi avatar_url bisa diupdate lewat policy existing)

COMMENT ON COLUMN conversations.avatar_url IS 'Avatar URL untuk grup chat, null untuk DM';