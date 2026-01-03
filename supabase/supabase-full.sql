


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'moderator',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_new_post_notifications"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Masukkan notifikasi untuk setiap pengikut dari pembuat postingan
  INSERT INTO public.notifications (user_id, from_user_id, type, post_id)
  SELECT
    follower_id, -- user_id dari penerima notifikasi (pengikut)
    NEW.user_id, -- from_user_id adalah pembuat postingan
    'new_post',    -- tipe notifikasi
    NEW.id         -- post_id dari postingan baru
  FROM public.followers
  WHERE following_id = NEW.user_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_new_post_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_welcome_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_notifications (user_id, title, message, type)
  VALUES (
    NEW.user_id,
    'Welcome to Star-Snap!',
    'We are happy to have you here. Explore the app and share your moments!',
    'info'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_welcome_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_comment_likes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update comments
  set likes_count = greatest(likes_count - 1, 0)
  where id = OLD.comment_id;
  return OLD;
end;
$$;


ALTER FUNCTION "public"."decrement_comment_likes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_followers_count"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET followers_count = GREATEST(0, followers_count - 1)
  WHERE profiles.user_id = decrement_followers_count.user_id;
END;
$$;


ALTER FUNCTION "public"."decrement_followers_count"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_following_count"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET following_count = GREATEST(0, following_count - 1)
  WHERE profiles.user_id = decrement_following_count.user_id;
END;
$$;


ALTER FUNCTION "public"."decrement_following_count"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_likes_count"("post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = post_id;
END;
$$;


ALTER FUNCTION "public"."decrement_likes_count"("post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_post_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.hashtags
  set posts_count = posts_count - 1
  where id = old.hashtag_id;
  return old;
end;
$$;


ALTER FUNCTION "public"."decrement_post_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_post"("p_post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM posts WHERE id = p_post_id;
END;
$$;


ALTER FUNCTION "public"."delete_post"("p_post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_data"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Hapus data dari tabel 'profiles'
  DELETE FROM public.profiles WHERE user_id = target_user_id;

  -- Jika ada tabel lain yang memiliki foreign key ke user_id, tambahkan di sini.
  -- Contoh: DELETE FROM public.posts WHERE user_id = target_user_id;

END;
$$;


ALTER FUNCTION "public"."delete_user_data"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extract_and_store_hashtags"("post_content" "text", "post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  hashtag_match TEXT;
  hashtag_name TEXT;
  hashtag_record RECORD;
BEGIN
  -- Clear existing hashtags for this post
  DELETE FROM post_hashtags WHERE post_hashtags.post_id = extract_and_store_hashtags.post_id;
  
  -- Extract hashtags from content
  FOR hashtag_match IN 
    SELECT unnest(regexp_matches(post_content, '#(\w+)', 'g'))
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
    VALUES (extract_and_store_hashtags.post_id, hashtag_record.id)
    ON CONFLICT (post_id, hashtag_id) DO NOTHING;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."extract_and_store_hashtags"("post_content" "text", "post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_notifications_for_user"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "type" "text", "created_at" timestamp with time zone, "is_read" boolean, "post_id" "uuid", "title" "text", "message" "text", "from_user_id" "uuid", "username" "text", "display_name" "text", "avatar_url" "text")
    LANGUAGE "sql"
    AS $$
  -- Ambil notifikasi standar (like, comment, follow) dan gabungkan dengan profil pengirim
  SELECT
    n.id,
    n.user_id,
    n.type,
    n.created_at,
    n.is_read,
    n.post_id,
    NULL::text AS title,
    NULL::text AS message,
    p.user_id AS from_user_id,
    p.username,
    p.display_name,
    p.avatar_url
  FROM
    notifications AS n
  JOIN
    profiles AS p ON n.from_user_id = p.user_id
  WHERE
    n.user_id = p_user_id

  UNION ALL

  -- Ambil notifikasi sistem
  SELECT
    un.id,
    un.user_id,
    un.type,
    un.created_at,
    un.is_read,
    NULL::uuid AS post_id,
    un.title,
    un.message,
    NULL::uuid AS from_user_id,
    NULL::text AS username,
    NULL::text AS display_name,
    NULL::text AS avatar_url
  FROM
    user_notifications AS un
  WHERE
    un.user_id = p_user_id

  ORDER BY created_at DESC;
$$;


ALTER FUNCTION "public"."get_all_notifications_for_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_posts"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "caption" "text", "location" "text", "likes_count" integer, "comments_count" integer, "created_at" timestamp with time zone, "username" "text", "display_name" "text", "avatar_url" "text", "media" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.caption,
    p.location,
    p.likes_count,
    p.comments_count,
    p.created_at,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'media_url', pm.media_url,
          'media_type', pm.media_type
        )
      )
      FROM post_media pm
      WHERE pm.post_id = p.id
    ) as media
  FROM posts p
  JOIN profiles pr ON p.user_id = pr.user_id
  ORDER BY p.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_all_posts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_conversations_with_details"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "is_group" boolean, "created_at" timestamp with time zone, "last_message_at" timestamp with time zone, "last_message" "text", "last_message_sender" "uuid", "members" json, "unread_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
    return query
    with user_conversations as (
        select c.id as conversation_id
        from conversations c
        join conversation_members cm on c.id = cm.conversation_id
        where cm.user_id = p_user_id
    ),
    conversation_details as (
        select
            c.id,
            c.name,
            c.is_group,
            c.created_at,
            c.last_message_at,
            (select m.content from messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_message,
            (select m.sender_id from messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_message_sender,
            (
                select json_agg(json_build_object(
                    'user_id', p.user_id,
                    'username', p.username,
                    'display_name', p.display_name,
                    'avatar_url', p.avatar_url
                ))
                from profiles p
                join conversation_members cm_inner on p.user_id = cm_inner.user_id
                where cm_inner.conversation_id = c.id
            ) as members,
            (
                select count(*)
                from messages m
                where m.conversation_id = c.id
                and m.created_at > COALESCE((
                    select cm_inner.last_read_at
                    from conversation_members cm_inner
                    where cm_inner.conversation_id = c.id and cm_inner.user_id = p_user_id
                ), '1970-01-01T00:00:00+00:00')
            ) as unread_count
        from conversations c
        where c.id in (select conversation_id from user_conversations)
    )
    select *
    from conversation_details
    order by last_message_at desc;
end;
$$;


ALTER FUNCTION "public"."get_conversations_with_details"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_memes_with_badges"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "caption" "text", "media_url" "text", "media_type" "text", "created_at" timestamp with time zone, "likes_count" integer, "comments_count" integer, "user" json, "badges" json[])
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.user_id,
        m.caption,
        m.media_url,
        m.media_type,
        m.created_at,
        m.likes_count,
        m.comments_count,
        json_build_object(
            'id', p.user_id,
            'username', p.username,
            'displayName', p.display_name,
            'avatar', p.avatar_url
        ) as "user",
        ARRAY(
            SELECT json_build_object('id', b.id, 'name', b.name)
            FROM public.meme_badges mb
            JOIN public.badges b ON mb.badge_id = b.id
            WHERE mb.meme_id = m.id
        ) as badges
    FROM
        public.memes m
    JOIN
        public.profiles p ON m.user_id = p.user_id
    ORDER BY
        m.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_memes_with_badges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_direct_conversation"("other_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  conversation_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if conversation already exists
  SELECT c.id INTO conversation_id
  FROM conversations c
  WHERE c.is_group = false
  AND EXISTS (
    SELECT 1 FROM conversation_members cm1
    WHERE cm1.conversation_id = c.id
    AND cm1.user_id = current_user_id
  )
  AND EXISTS (
    SELECT 1 FROM conversation_members cm2
    WHERE cm2.conversation_id = c.id
    AND cm2.user_id = other_user_id
  )
  AND (
    SELECT COUNT(*) FROM conversation_members cm3
    WHERE cm3.conversation_id = c.id
  ) = 2
  LIMIT 1;
  
  -- If not exists, create new conversation
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (is_group, created_by)
    VALUES (false, current_user_id)
    RETURNING id INTO conversation_id;
    
    -- Add both members
    INSERT INTO conversation_members (conversation_id, user_id)
    VALUES (conversation_id, current_user_id);
    
    INSERT INTO conversation_members (conversation_id, user_id)
    VALUES (conversation_id, other_user_id);
  END IF;
  
  RETURN conversation_id;
END;
$$;


ALTER FUNCTION "public"."get_or_create_direct_conversation"("other_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trending_hashtags"("limit_count" integer) RETURNS TABLE("hashtag" "text", "post_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    '#' || name as hashtag,
    posts_count::bigint as post_count
  FROM hashtags
  WHERE posts_count > 0
  ORDER BY posts_count DESC, updated_at DESC
  LIMIT limit_count;
$$;


ALTER FUNCTION "public"."get_trending_hashtags"("limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_groups"("p_user_id" "uuid") RETURNS TABLE("group_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT group_id
  FROM public.group_members
  WHERE user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_user_groups"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_posts"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "caption" "text", "location" "text", "likes_count" integer, "comments_count" integer, "created_at" timestamp with time zone, "username" "text", "display_name" "text", "avatar_url" "text", "media" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.caption,
    p.location,
    p.likes_count,
    p.comments_count,
    p.created_at,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'media_url', pm.media_url,
          'media_type', pm.media_type
        )
      )
      FROM post_media pm
      WHERE pm.post_id = p.id
    ) as media
  FROM posts p
  JOIN profiles pr ON p.user_id = pr.user_id
  WHERE p.user_id = p_user_id
  ORDER BY p.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_posts"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.profiles (user_id, username, display_name)
    VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'display_name');
    RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_post_hashtags"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.caption IS DISTINCT FROM NEW.caption) THEN
    PERFORM extract_and_store_hashtags(COALESCE(NEW.caption, ''), NEW.id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_post_hashtags"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- hapus semua object storage milik user
  delete from storage.objects where owner = old.id;

  -- hapus setting / notifications terkait
  delete from public.user_settings where user_id = old.id;
  delete from public.user_notifications where user_id = old.id;

  return old;
end;
$$;


ALTER FUNCTION "public"."handle_user_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.profiles
  SET
    username = NEW.raw_user_meta_data->>'username',
    display_name = NEW.raw_user_meta_data->>'display_name',
    avatar_url = NEW.raw_user_meta_data->>'avatar_url'
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_comment_likes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update comments
  set likes_count = likes_count + 1
  where id = NEW.comment_id;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."increment_comment_likes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_followers_count"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET followers_count = followers_count + 1
  WHERE profiles.user_id = increment_followers_count.user_id;
END;
$$;


ALTER FUNCTION "public"."increment_followers_count"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_following_count"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET following_count = following_count + 1
  WHERE profiles.user_id = increment_following_count.user_id;
END;
$$;


ALTER FUNCTION "public"."increment_following_count"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_likes_count"("post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = likes_count + 1
  WHERE id = post_id;
END;
$$;


ALTER FUNCTION "public"."increment_likes_count"("post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_post_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.hashtags
  set posts_count = posts_count + 1
  where id = new.hashtag_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."increment_post_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_conversation_member"("p_conversation_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."is_conversation_member"("p_conversation_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member_of_group"("_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = _group_id
      AND user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_member_of_group"("_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_message"("p_conversation_id" "uuid", "p_content" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  message_id UUID;
BEGIN
  -- Insert message
  INSERT INTO messages (conversation_id, sender_id, content)
  VALUES (p_conversation_id, auth.uid(), p_content)
  RETURNING id INTO message_id;
  
  -- Update conversation last_message_at
  UPDATE conversations
  SET last_message_at = now()
  WHERE id = p_conversation_id;
  
  RETURN message_id;
END;
$$;


ALTER FUNCTION "public"."send_message"("p_conversation_id" "uuid", "p_content" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_like"("p_user_id" "uuid", "p_post_id" "uuid" DEFAULT NULL::"uuid", "p_meme_id" "uuid" DEFAULT NULL::"uuid", "p_comment_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  like_exists BOOLEAN := false;
  target_table TEXT;
  target_column TEXT;
  target_id UUID;
BEGIN
  IF p_post_id IS NOT NULL THEN
    target_table := 'posts';
    target_column := 'post_id';
    target_id := p_post_id;
  ELSIF p_meme_id IS NOT NULL THEN
    target_table := 'memes';
    target_column := 'meme_id';
    target_id := p_meme_id;
  ELSIF p_comment_id IS NOT NULL THEN
    target_table := 'comments';
    target_column := 'comment_id';
    target_id := p_comment_id;
  ELSE
    RAISE EXCEPTION 'Must provide either post_id, meme_id, or comment_id';
  END IF;

  -- Check if like exists
  EXECUTE format(
    'SELECT EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND %I = $2)',
    target_column
  )
  INTO like_exists
  USING p_user_id, target_id;

  IF like_exists THEN
    -- Remove like
    EXECUTE format('DELETE FROM likes WHERE user_id = $1 AND %I = $2', target_column)
    USING p_user_id, target_id;
    
    -- Decrease count
    EXECUTE format(
      'UPDATE %I SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1',
      target_table
    )
    USING target_id;
    
    RETURN false; -- Like removed
  ELSE
    -- Add like
    EXECUTE format(
      'INSERT INTO likes (user_id, %I) VALUES ($1, $2)',
      target_column
    )
    USING p_user_id, target_id;
    
    -- Increase count
    EXECUTE format(
      'UPDATE %I SET likes_count = likes_count + 1 WHERE id = $1',
      target_table
    )
    USING target_id;
    
    RETURN true; -- Like added
  END IF;
END;
$_$;


ALTER FUNCTION "public"."toggle_like"("p_user_id" "uuid", "p_post_id" "uuid", "p_meme_id" "uuid", "p_comment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."badges" OWNER TO "postgres";


COMMENT ON TABLE "public"."badges" IS 'Stores available badges for memes.';



ALTER TABLE "public"."badges" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."badges_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."bookmark_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bookmark_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookmarks" (
    "id" bigint NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "post_id" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone,
    "folder_id" "uuid"
);


ALTER TABLE "public"."bookmarks" OWNER TO "postgres";


ALTER TABLE "public"."bookmarks" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."bookmarks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "post_id" "uuid",
    "meme_id" "uuid",
    "parent_comment_id" "uuid",
    "content" "text" NOT NULL,
    "likes_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "comments_check" CHECK (((("post_id" IS NOT NULL) AND ("meme_id" IS NULL)) OR (("post_id" IS NULL) AND ("meme_id" IS NOT NULL))))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_read_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversation_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "is_group" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_message_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."followers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "followers_check" CHECK (("follower_id" <> "following_id"))
);


ALTER TABLE "public"."followers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hashtags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "posts_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hashtags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "post_id" "uuid",
    "meme_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "comment_id" "uuid",
    CONSTRAINT "likes_check" CHECK (("num_nonnulls"("post_id", "comment_id", "meme_id") = 1))
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_mode" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page_path" "text" NOT NULL,
    "is_active" boolean DEFAULT false,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'warning'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "maintenance_mode_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'warning'::"text", 'maintenance'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."maintenance_mode" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "executed_by" "uuid",
    "executed_at" timestamp with time zone,
    "result" "jsonb",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."maintenance_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meme_badges" (
    "meme_id" "uuid" NOT NULL,
    "badge_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meme_badges" OWNER TO "postgres";


COMMENT ON TABLE "public"."meme_badges" IS 'Associates memes with badges.';



CREATE TABLE IF NOT EXISTS "public"."memes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "caption" "text",
    "media_url" "text" NOT NULL,
    "media_type" "text" NOT NULL,
    "likes_count" integer DEFAULT 0,
    "comments_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "memes_media_type_check" CHECK (("media_type" = ANY (ARRAY['image'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."memes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "attachment_url" "text",
    "attachment_type" "text"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "post_id" "uuid",
    "meme_id" "uuid",
    "comment_id" "uuid",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['like'::"text", 'comment'::"text", 'follow'::"text", 'new_post'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_hashtags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "hashtag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."post_hashtags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "media_url" "text" NOT NULL,
    "media_type" "text" NOT NULL,
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "post_media_media_type_check" CHECK (("media_type" = ANY (ARRAY['image'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."post_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "caption" "text",
    "location" "text",
    "likes_count" integer DEFAULT 0,
    "comments_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_repost" boolean DEFAULT false,
    "reposted_by" "uuid",
    "original_post_id" "uuid",
    "isBookmarked" "text",
    "delete_reason" "text",
    "deleted_by" "uuid",
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "username" "text",
    "display_name" "text",
    "bio" "text",
    "avatar_url" "text",
    "followers_count" integer DEFAULT 0,
    "following_count" integer DEFAULT 0,
    "posts_count" integer DEFAULT 0,
    "is_private" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text" DEFAULT 'user'::"text",
    "cover_img" "text",
    "is_verified" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reported_user_id" "uuid",
    "post_id" "uuid",
    "comment_id" "uuid",
    "meme_id" "uuid",
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid"
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "media_url" "text" NOT NULL,
    "media_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_health" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "check_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "details" "jsonb",
    "checked_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."system_health" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "artist" "text",
    "album_title" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "music_url" "text",
    "audio" "text",
    "preview" "text"
);


ALTER TABLE "public"."tracks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."user_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "device" "text",
    "ip_address" "text",
    "user_agent" "text",
    "refresh_token" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_seen" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notifications_enabled" boolean DEFAULT true,
    "like_notifications" boolean DEFAULT true,
    "comment_notifications" boolean DEFAULT true,
    "follow_notifications" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookmark_folders"
    ADD CONSTRAINT "bookmark_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_members"
    ADD CONSTRAINT "conversation_members_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_members"
    ADD CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_follower_id_following_id_key" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hashtags"
    ADD CONSTRAINT "hashtags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."hashtags"
    ADD CONSTRAINT "hashtags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_comment_unique" UNIQUE ("user_id", "comment_id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_meme_unique" UNIQUE ("user_id", "meme_id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_post_unique" UNIQUE ("user_id", "post_id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."maintenance_mode"
    ADD CONSTRAINT "maintenance_mode_page_path_key" UNIQUE ("page_path");



ALTER TABLE ONLY "public"."maintenance_mode"
    ADD CONSTRAINT "maintenance_mode_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_tasks"
    ADD CONSTRAINT "maintenance_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meme_badges"
    ADD CONSTRAINT "meme_badges_pkey" PRIMARY KEY ("meme_id", "badge_id");



ALTER TABLE ONLY "public"."memes"
    ADD CONSTRAINT "memes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_hashtags"
    ADD CONSTRAINT "post_hashtags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_hashtags"
    ADD CONSTRAINT "post_hashtags_post_id_hashtag_id_key" UNIQUE ("post_id", "hashtag_id");



ALTER TABLE ONLY "public"."post_media"
    ADD CONSTRAINT "post_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_health"
    ADD CONSTRAINT "system_health_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "unique_follower_following" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "unique_user_meme_like" UNIQUE ("user_id", "meme_id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "unique_user_post_like" UNIQUE ("user_id", "post_id");



ALTER TABLE ONLY "public"."user_logs"
    ADD CONSTRAINT "user_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_refresh_token_key" UNIQUE ("refresh_token");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_comments_meme_id" ON "public"."comments" USING "btree" ("meme_id");



CREATE INDEX "idx_comments_post_id" ON "public"."comments" USING "btree" ("post_id");



CREATE INDEX "idx_comments_user_id" ON "public"."comments" USING "btree" ("user_id");



CREATE INDEX "idx_conversation_members_conversation_id" ON "public"."conversation_members" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversation_members_user_id" ON "public"."conversation_members" USING "btree" ("user_id");



CREATE INDEX "idx_conversations_last_message_at" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_followers_follower_id" ON "public"."followers" USING "btree" ("follower_id");



CREATE INDEX "idx_followers_following_id" ON "public"."followers" USING "btree" ("following_id");



CREATE INDEX "idx_hashtags_name" ON "public"."hashtags" USING "btree" ("name");



CREATE INDEX "idx_hashtags_posts_count" ON "public"."hashtags" USING "btree" ("posts_count" DESC);



CREATE INDEX "idx_likes_meme_id" ON "public"."likes" USING "btree" ("meme_id");



CREATE INDEX "idx_likes_post_id" ON "public"."likes" USING "btree" ("post_id");



CREATE INDEX "idx_likes_user_id" ON "public"."likes" USING "btree" ("user_id");



CREATE INDEX "idx_memes_created_at" ON "public"."memes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_memes_user_id" ON "public"."memes" USING "btree" ("user_id");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_post_hashtags_hashtag_id" ON "public"."post_hashtags" USING "btree" ("hashtag_id");



CREATE INDEX "idx_post_hashtags_post_id" ON "public"."post_hashtags" USING "btree" ("post_id");



CREATE INDEX "idx_posts_created_at" ON "public"."posts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_posts_user_id" ON "public"."posts" USING "btree" ("user_id");



CREATE INDEX "idx_user_logs_user_id" ON "public"."user_logs" USING "btree" ("user_id");



CREATE INDEX "idx_user_sessions_user_id" ON "public"."user_sessions" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "extract_hashtags_memes_trigger" AFTER INSERT OR UPDATE ON "public"."memes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_post_hashtags"();



CREATE OR REPLACE TRIGGER "extract_hashtags_trigger" AFTER INSERT OR UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_post_hashtags"();



CREATE OR REPLACE TRIGGER "on_like_delete" AFTER DELETE ON "public"."likes" FOR EACH ROW WHEN (("old"."comment_id" IS NOT NULL)) EXECUTE FUNCTION "public"."decrement_comment_likes"();



CREATE OR REPLACE TRIGGER "on_like_insert" AFTER INSERT ON "public"."likes" FOR EACH ROW WHEN (("new"."comment_id" IS NOT NULL)) EXECUTE FUNCTION "public"."increment_comment_likes"();



CREATE OR REPLACE TRIGGER "on_new_post_created" AFTER INSERT ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."create_new_post_notifications"();



CREATE OR REPLACE TRIGGER "on_post_hashtag_delete" AFTER DELETE ON "public"."post_hashtags" FOR EACH ROW EXECUTE FUNCTION "public"."decrement_post_count"();



CREATE OR REPLACE TRIGGER "on_post_hashtag_insert" AFTER INSERT ON "public"."post_hashtags" FOR EACH ROW EXECUTE FUNCTION "public"."increment_post_count"();



CREATE OR REPLACE TRIGGER "trg_create_welcome_notification" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."create_welcome_notification"();



CREATE OR REPLACE TRIGGER "trigger_welcome_notification" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."create_welcome_notification"();



CREATE OR REPLACE TRIGGER "update_comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_hashtags_updated_at" BEFORE UPDATE ON "public"."hashtags" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_maintenance_mode_updated_at" BEFORE UPDATE ON "public"."maintenance_mode" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_maintenance_tasks_updated_at" BEFORE UPDATE ON "public"."maintenance_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_memes_updated_at" BEFORE UPDATE ON "public"."memes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_posts_updated_at" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."bookmark_folders"
    ADD CONSTRAINT "bookmark_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."bookmark_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_meme_id_fkey" FOREIGN KEY ("meme_id") REFERENCES "public"."memes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_members"
    ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_meme_id_fkey" FOREIGN KEY ("meme_id") REFERENCES "public"."memes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_mode"
    ADD CONSTRAINT "maintenance_mode_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_tasks"
    ADD CONSTRAINT "maintenance_tasks_executed_by_fkey" FOREIGN KEY ("executed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."meme_badges"
    ADD CONSTRAINT "meme_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meme_badges"
    ADD CONSTRAINT "meme_badges_meme_id_fkey" FOREIGN KEY ("meme_id") REFERENCES "public"."memes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memes"
    ADD CONSTRAINT "memes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_meme_id_fkey" FOREIGN KEY ("meme_id") REFERENCES "public"."memes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_hashtags"
    ADD CONSTRAINT "post_hashtags_hashtag_id_fkey" FOREIGN KEY ("hashtag_id") REFERENCES "public"."hashtags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_hashtags"
    ADD CONSTRAINT "post_hashtags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_media"
    ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_original_post_id_fkey" FOREIGN KEY ("original_post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_reposted_by_fkey" FOREIGN KEY ("reposted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_meme_id_fkey" FOREIGN KEY ("meme_id") REFERENCES "public"."memes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_logs"
    ADD CONSTRAINT "user_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



CREATE POLICY "ALl" ON "public"."bookmarks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Admins can create maintenance tasks" ON "public"."maintenance_tasks" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete roles" ON "public"."user_roles" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert roles" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage maintenance" ON "public"."maintenance_mode" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update maintenance tasks" ON "public"."maintenance_tasks" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update reports" ON "public"."reports" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update roles" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all reports" ON "public"."reports" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view maintenance tasks" ON "public"."maintenance_tasks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view system health" ON "public"."system_health" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow authenticated users to insert likes" ON "public"."likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow authenticated users to insert their own likes." ON "public"."likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow authenticated users to send messages to their conversatio" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND ("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"))));



CREATE POLICY "Anyone can view maintenance status" ON "public"."maintenance_mode" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can add badges to memes." ON "public"."meme_badges" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can create new badges." ON "public"."badges" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Badges are viewable by everyone." ON "public"."badges" FOR SELECT USING (true);



CREATE POLICY "Comments are viewable by everyone" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Editor_Roles" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."bookmarks" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."user_logs" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."bookmarks" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."conversation_members" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."likes" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."post_media" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."stories" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."tracks" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."user_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."user_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."bookmarks" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."conversation_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."followers" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."likes" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."messages" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."notifications" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."post_hashtags" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."post_media" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."posts" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."stories" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."tracks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."user_logs" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."user_settings" FOR SELECT USING (true);



CREATE POLICY "Enable users to view their own data only" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Followers are viewable by everyone" ON "public"."followers" FOR SELECT USING (true);



CREATE POLICY "Hashtags are viewable by everyone" ON "public"."hashtags" FOR SELECT USING (true);



CREATE POLICY "Insert session for self" ON "public"."user_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Likes are viewable by everyone" ON "public"."likes" FOR SELECT USING (true);



CREATE POLICY "Members can view conversation messages" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_members"
  WHERE (("conversation_members"."conversation_id" = "messages"."conversation_id") AND ("conversation_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Members can view their conversations" ON "public"."conversations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_members"
  WHERE (("conversation_members"."conversation_id" = "conversations"."id") AND ("conversation_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Meme-badge links are viewable by everyone." ON "public"."meme_badges" FOR SELECT USING (true);



CREATE POLICY "Memes are viewable by everyone" ON "public"."memes" FOR SELECT USING (true);



CREATE POLICY "Post hashtags are viewable by everyone" ON "public"."post_hashtags" FOR SELECT USING (true);



CREATE POLICY "Post media are viewable by everyone" ON "public"."post_media" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Stories are viewable by everyone" ON "public"."stories" FOR SELECT USING (true);



CREATE POLICY "System can create hashtags" ON "public"."hashtags" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can create notifications" ON "public"."user_notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can create post hashtags" ON "public"."post_hashtags" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert health checks" ON "public"."system_health" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can update hashtag counts" ON "public"."hashtags" FOR UPDATE USING (true);



CREATE POLICY "Users can add members to conversations they created" ON "public"."conversation_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "conversation_members"."conversation_id") AND ("conversations"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can create comments" ON "public"."comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create media for their own posts" ON "public"."post_media" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."posts"
  WHERE (("posts"."id" = "post_media"."post_id") AND ("posts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create reports" ON "public"."reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can create their own folders" ON "public"."bookmark_folders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own memes" ON "public"."memes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own posts" ON "public"."posts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own stories" ON "public"."stories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own folders" ON "public"."bookmark_folders" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own memes" ON "public"."memes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own posts" ON "public"."posts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own stories" ON "public"."stories" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can follow others" ON "public"."followers" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own settings" ON "public"."user_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can like content" ON "public"."likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can send messages to their conversations" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "sender_id") AND (EXISTS ( SELECT 1
   FROM "public"."conversation_members"
  WHERE (("conversation_members"."conversation_id" = "messages"."conversation_id") AND ("conversation_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can unfollow others" ON "public"."followers" FOR DELETE USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can unlike content" ON "public"."likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update conversations they are members of" ON "public"."conversations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_members"
  WHERE (("conversation_members"."conversation_id" = "conversations"."id") AND ("conversation_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own comments" ON "public"."comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own folders" ON "public"."bookmark_folders" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own memes" ON "public"."memes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."user_notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own posts" ON "public"."posts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own sessions" ON "public"."user_sessions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own settings" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own folders" ON "public"."bookmark_folders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own memberships" ON "public"."conversation_members" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."user_notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own reports" ON "public"."reports" FOR SELECT USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can view their own sessions" ON "public"."user_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own settings" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can''t delete badge connections." ON "public"."meme_badges" FOR DELETE USING (false);



ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookmark_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookmarks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."followers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hashtags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_only_if_member" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."conversation_members" "cm"
  WHERE (("cm"."conversation_id" = "messages"."conversation_id") AND ("cm"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_mode" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meme_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."memes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_hashtags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "require_member_to_view_conversation" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_members" "cm"
  WHERE (("cm"."conversation_id" = "conversations"."id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "select_messages_for_member" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_members" "cm"
  WHERE (("cm"."conversation_id" = "messages"."conversation_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "select_messages_of_own_chat" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_members" "cm"
  WHERE (("cm"."conversation_id" = "messages"."conversation_id") AND ("cm"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."stories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_health" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tracks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversation_members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_new_post_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_new_post_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_new_post_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_welcome_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_welcome_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_welcome_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_comment_likes"() TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_comment_likes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_comment_likes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_followers_count"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_followers_count"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_followers_count"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_following_count"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_following_count"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_following_count"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_likes_count"("post_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_likes_count"("post_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_likes_count"("post_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_post_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_post_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_post_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_post"("p_post_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_post"("p_post_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_post"("p_post_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_data"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_data"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_data"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."extract_and_store_hashtags"("post_content" "text", "post_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."extract_and_store_hashtags"("post_content" "text", "post_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_and_store_hashtags"("post_content" "text", "post_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_notifications_for_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_notifications_for_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_notifications_for_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_posts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_posts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_posts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_conversations_with_details"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_conversations_with_details"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversations_with_details"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_memes_with_badges"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_memes_with_badges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_memes_with_badges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_direct_conversation"("other_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_direct_conversation"("other_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_direct_conversation"("other_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trending_hashtags"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_trending_hashtags"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trending_hashtags"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_groups"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_groups"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_groups"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_posts"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_posts"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_posts"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_post_hashtags"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_post_hashtags"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_post_hashtags"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_comment_likes"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_comment_likes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_comment_likes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_followers_count"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_followers_count"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_followers_count"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_following_count"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_following_count"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_following_count"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_likes_count"("post_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_likes_count"("post_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_likes_count"("post_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_post_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_post_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_post_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_conversation_member"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_conversation_member"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_conversation_member"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member_of_group"("_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member_of_group"("_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member_of_group"("_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_message"("p_conversation_id" "uuid", "p_content" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_message"("p_conversation_id" "uuid", "p_content" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_message"("p_conversation_id" "uuid", "p_content" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_like"("p_user_id" "uuid", "p_post_id" "uuid", "p_meme_id" "uuid", "p_comment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_like"("p_user_id" "uuid", "p_post_id" "uuid", "p_meme_id" "uuid", "p_comment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_like"("p_user_id" "uuid", "p_post_id" "uuid", "p_meme_id" "uuid", "p_comment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."badges" TO "anon";
GRANT ALL ON TABLE "public"."badges" TO "authenticated";
GRANT ALL ON TABLE "public"."badges" TO "service_role";



GRANT ALL ON SEQUENCE "public"."badges_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."badges_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."badges_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bookmark_folders" TO "anon";
GRANT ALL ON TABLE "public"."bookmark_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."bookmark_folders" TO "service_role";



GRANT ALL ON TABLE "public"."bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."bookmarks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bookmarks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bookmarks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bookmarks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_members" TO "anon";
GRANT ALL ON TABLE "public"."conversation_members" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_members" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."followers" TO "anon";
GRANT ALL ON TABLE "public"."followers" TO "authenticated";
GRANT ALL ON TABLE "public"."followers" TO "service_role";



GRANT ALL ON TABLE "public"."hashtags" TO "anon";
GRANT ALL ON TABLE "public"."hashtags" TO "authenticated";
GRANT ALL ON TABLE "public"."hashtags" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_mode" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_mode" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_mode" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_tasks" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."meme_badges" TO "anon";
GRANT ALL ON TABLE "public"."meme_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."meme_badges" TO "service_role";



GRANT ALL ON TABLE "public"."memes" TO "anon";
GRANT ALL ON TABLE "public"."memes" TO "authenticated";
GRANT ALL ON TABLE "public"."memes" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."post_hashtags" TO "anon";
GRANT ALL ON TABLE "public"."post_hashtags" TO "authenticated";
GRANT ALL ON TABLE "public"."post_hashtags" TO "service_role";



GRANT ALL ON TABLE "public"."post_media" TO "anon";
GRANT ALL ON TABLE "public"."post_media" TO "authenticated";
GRANT ALL ON TABLE "public"."post_media" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."stories" TO "anon";
GRANT ALL ON TABLE "public"."stories" TO "authenticated";
GRANT ALL ON TABLE "public"."stories" TO "service_role";



GRANT ALL ON TABLE "public"."system_health" TO "anon";
GRANT ALL ON TABLE "public"."system_health" TO "authenticated";
GRANT ALL ON TABLE "public"."system_health" TO "service_role";



GRANT ALL ON TABLE "public"."tracks" TO "anon";
GRANT ALL ON TABLE "public"."tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."tracks" TO "service_role";



GRANT ALL ON TABLE "public"."user_logs" TO "anon";
GRANT ALL ON TABLE "public"."user_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_logs" TO "service_role";



GRANT ALL ON TABLE "public"."user_notifications" TO "anon";
GRANT ALL ON TABLE "public"."user_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































