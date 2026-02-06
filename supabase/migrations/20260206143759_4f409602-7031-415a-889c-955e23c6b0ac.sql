
-- Fix handle_user_update trigger to NOT overwrite custom avatar/display_name/username
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET
    username = COALESCE(profiles.username, NEW.raw_user_meta_data->>'username'),
    display_name = COALESCE(profiles.display_name, NEW.raw_user_meta_data->>'display_name'),
    avatar_url = COALESCE(profiles.avatar_url, NEW.raw_user_meta_data->>'avatar_url')
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$function$;

-- Allow users to delete their own standard notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own system notifications
CREATE POLICY "Users can delete their own system notifications"
ON public.user_notifications
FOR DELETE
USING (auth.uid() = user_id);
