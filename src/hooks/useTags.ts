import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrendingTag {
  name: string;
  post_count: number;
}

export function useTrendingTags(limit: number = 10) {
  return useQuery({
    queryKey: ["trendingTags", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hashtags')
        .select('name, posts_count')
        .gt('posts_count', 0) // Only fetch tags with more than 0 posts
        .order('posts_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching trending tags:", error);
        throw error;
      }

      // The table has 'posts_count', but the interface expects 'post_count'.
      // We map the data to match the interface.
      const formattedData = data.map(tag => ({
        name: tag.name,
        post_count: tag.posts_count,
      }));

      return formattedData as TrendingTag[];
    },
  });
}

export function usePostTags(postId: string) {
  return useQuery({
    queryKey: ["postTags", postId],
    queryFn: async () => {
      const { data: post, error } = await supabase
        .from("posts")
        .select("caption")
        .eq("id", postId)
        .single();

      if (error) throw error;

      // Extract hashtags from caption
      const hashtags = post.caption?.match(/#\w+/g) || [];
      return hashtags.map(tag => tag.toLowerCase());
    },
  });
}

export function usePostsByTag(tag: string) {
  return useQuery({
    queryKey: ["postsByTag", tag],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          user_id,
          caption,
          location,
          created_at,
          likes_count,
          comments_count,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url
          ),
          post_media (
            media_url,
            media_type
          )
        `)
        .ilike("caption", `%${tag}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((post: any) => ({
        id: post.id,
        content: post.caption || '',
        location: post.location,
        created_at: post.created_at,
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        isLiked: false,
        isBookmarked: false,
        image_url: post.post_media?.[0]?.media_url,
        user: {
          username: post.profiles?.username || '',
          displayName: post.profiles?.display_name || post.profiles?.username || '',
          avatar: post.profiles?.avatar_url || '',
        },
        user_id: post.user_id,
      }));
    },
    enabled: !!tag,
  });
}