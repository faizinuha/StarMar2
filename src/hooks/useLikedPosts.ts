import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LikedPost {
  id: string;
  post_id: string;
  created_at: string;
  post: {
    id: string;
    caption: string | null;
    created_at: string;
    likes_count: number;
    comments_count: number;
    user_id: string;
    location: string | null;
    media: {
      media_url: string;
      media_type: string;
      order_index: number;
    }[];
    user: {
      username: string;
      display_name: string;
      avatar_url: string;
    };
  };
}

export const useLikedPosts = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['liked-posts', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      // Get all likes for posts by this user
      const { data: likes, error } = await supabase
        .from('likes')
        .select(`
          id,
          post_id,
          created_at
        `)
        .eq('user_id', targetUserId)
        .not('post_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!likes || likes.length === 0) return [];

      // Get the post details for each liked post
      const postIds = likes.map(l => l.post_id).filter(Boolean);
      
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          caption,
          created_at,
          likes_count,
          comments_count,
          user_id,
          location,
          post_media (
            media_url,
            media_type,
            order_index
          ),
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .in('id', postIds);

      if (postsError) throw postsError;

      // Map posts to the expected format
      return (posts || []).map(post => {
        const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
        const media = (post.post_media || []).sort((a: any, b: any) => 
          (a.order_index || 0) - (b.order_index || 0)
        );
        
        return {
          id: post.id,
          user_id: post.user_id,
          content: post.caption || '',
          image_url: media[0]?.media_url || '',
          created_at: post.created_at,
          likes: post.likes_count || 0,
          likes_count: post.likes_count || 0,
          comments: post.comments_count || 0,
          comments_count: post.comments_count || 0,
          location: post.location,
          media: media,
          user: {
            username: profile?.username || 'user',
            displayName: profile?.display_name || 'User',
            avatar: profile?.avatar_url || '',
          },
          isLiked: true,
          isBookmarked: false,
        };
      });
    },
    enabled: !!targetUserId,
  });
};
