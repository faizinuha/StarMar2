import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBookmarkedPosts = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['bookmarked-posts', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      // Get all bookmarks for this user
      const { data: bookmarks, error } = await supabase
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', targetUserId)
        .not('post_id', 'is', null);

      if (error) throw error;
      if (!bookmarks || bookmarks.length === 0) return [];

      const postIds = bookmarks.map(b => b.post_id).filter(Boolean);
      
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

      return (posts || []).map(post => {
        const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
        const media = (post.post_media || []).sort((a: any, b: any) => 
          (a.order_index || 0) - (b.order_index || 0)
        );
        
        // Get the first media URL
        const firstMediaUrl = media[0]?.media_url || '';
        const firstMediaType = media[0]?.media_type || 'image';
        
        return {
          id: post.id,
          user_id: post.user_id,
          content: post.caption || '',
          image_url: firstMediaUrl,
          media_type: firstMediaType,
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
          isLiked: false,
          isBookmarked: true,
        };
      });
    },
    enabled: !!targetUserId,
  });
};
