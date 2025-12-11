-- Create a security definer function for admin to update ban status
-- This avoids the recursive RLS issue when checking profiles.role

CREATE OR REPLACE FUNCTION public.admin_update_ban_status(
  target_user_id uuid,
  is_banned_val boolean,
  ban_reason_val text DEFAULT NULL,
  banned_by_val uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if current user is admin using the has_role function or profiles.role
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) OR public.has_role(auth.uid(), 'admin')
  INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can update ban status';
  END IF;
  
  -- Update the target user's ban status
  UPDATE profiles
  SET 
    is_banned = is_banned_val,
    ban_reason = ban_reason_val,
    banned_at = CASE WHEN is_banned_val THEN now() ELSE NULL END,
    banned_by = banned_by_val
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_update_ban_status TO authenticated;