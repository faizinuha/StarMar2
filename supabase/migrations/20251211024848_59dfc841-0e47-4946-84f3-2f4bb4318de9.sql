-- Add unique constraint on page_path for proper upsert
ALTER TABLE public.maintenance_mode DROP CONSTRAINT IF EXISTS maintenance_mode_page_path_key;
ALTER TABLE public.maintenance_mode ADD CONSTRAINT maintenance_mode_page_path_key UNIQUE (page_path);