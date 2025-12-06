-- Add social_links column to profiles for storing social media links
-- Format: JSON array with objects {platform: string, url: string}
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.social_links IS 'Array of social media links: [{platform: string, url: string}]';