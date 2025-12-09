-- Drop all related triggers first
DROP TRIGGER IF EXISTS handle_post_hashtags_trigger ON posts;
DROP TRIGGER IF EXISTS extract_hashtags_trigger ON posts;
DROP TRIGGER IF EXISTS extract_hashtags_memes_trigger ON memes;

-- Drop the old functions with CASCADE
DROP FUNCTION IF EXISTS handle_post_hashtags() CASCADE;
DROP FUNCTION IF EXISTS extract_and_store_hashtags(text, uuid) CASCADE;

-- Create a new, cleaner hashtag extraction function with proper variable naming
CREATE OR REPLACE FUNCTION public.extract_and_store_hashtags(p_post_content text, p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  hashtag_match TEXT;
  hashtag_name TEXT;
  hashtag_record RECORD;
BEGIN
  -- Clear existing hashtags for this post
  DELETE FROM post_hashtags WHERE post_hashtags.post_id = p_post_id;
  
  -- Extract hashtags from content
  FOR hashtag_match IN 
    SELECT unnest(regexp_matches(p_post_content, '#(\w+)', 'g'))
  LOOP
    hashtag_name := lower(hashtag_match);
    
    -- Insert or get existing hashtag
    INSERT INTO hashtags (name, posts_count)
    VALUES (hashtag_name, 1)
    ON CONFLICT (name) 
    DO UPDATE SET 
      posts_count = hashtags.posts_count + 1,
      updated_at = now()
    RETURNING * INTO hashtag_record;
    
    -- If we didn't get a record from INSERT, get it from SELECT
    IF hashtag_record.id IS NULL THEN
      SELECT * INTO hashtag_record FROM hashtags WHERE name = hashtag_name;
      UPDATE hashtags SET posts_count = posts_count + 1, updated_at = now() WHERE id = hashtag_record.id;
    END IF;
    
    -- Link hashtag to post
    INSERT INTO post_hashtags (post_id, hashtag_id)
    VALUES (p_post_id, hashtag_record.id)
    ON CONFLICT (post_id, hashtag_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Create trigger function with proper variable naming
CREATE OR REPLACE FUNCTION public.handle_post_hashtags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.caption IS DISTINCT FROM NEW.caption) THEN
    PERFORM extract_and_store_hashtags(COALESCE(NEW.caption, ''), NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger for posts
CREATE TRIGGER extract_hashtags_trigger
AFTER INSERT OR UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION handle_post_hashtags();