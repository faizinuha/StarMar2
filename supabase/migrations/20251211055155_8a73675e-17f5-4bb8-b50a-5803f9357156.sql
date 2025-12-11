-- Create security definer function for admin to update user profiles
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  target_user_id uuid,
  update_data jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if current user is admin using profiles.role or has_role function
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) OR public.has_role(auth.uid(), 'admin')
  INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can update other users profiles';
  END IF;
  
  -- Update the target user's profile with provided data
  UPDATE profiles
  SET 
    is_verified = COALESCE((update_data->>'is_verified')::text, is_verified),
    role = COALESCE((update_data->>'role')::text, role),
    is_banned = COALESCE((update_data->>'is_banned')::boolean, is_banned),
    ban_reason = CASE 
      WHEN update_data ? 'ban_reason' THEN (update_data->>'ban_reason')::text
      ELSE ban_reason
    END,
    banned_at = CASE 
      WHEN update_data ? 'banned_at' THEN 
        CASE WHEN update_data->>'banned_at' IS NULL THEN NULL ELSE (update_data->>'banned_at')::timestamptz END
      ELSE banned_at
    END,
    banned_by = CASE 
      WHEN update_data ? 'banned_by' THEN 
        CASE WHEN update_data->>'banned_by' IS NULL THEN NULL ELSE (update_data->>'banned_by')::uuid END
      ELSE banned_by
    END,
    updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$$;