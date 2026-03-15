
-- Drop existing indexes and recreate as proper unique constraints
DROP INDEX IF EXISTS public.uniq_post_view_user;
DROP INDEX IF EXISTS public.uniq_post_view_session;

ALTER TABLE public.post_views
ADD CONSTRAINT uniq_post_view_user UNIQUE (post_id, viewer_id);

ALTER TABLE public.post_views
ADD CONSTRAINT uniq_post_view_session UNIQUE (post_id, session_id);
