import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

export interface OptimizedPost {
  id: string;
  user_id: string;
  caption: string;
  location?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  isLiked: boolean;
  isBookmarked: boolean;
  image_url?: string;
  media_type?: string;
  media?: Array<{ media_url: string; media_type: string; order_index?: number }>;
  user: {
    username: string;
    displayName: string;
    avatar: string;
  };
  user_id_str: string;
}

const POSTS_PER_PAGE = 10;

const processUrl = async (url: string | undefined | null): Promise<string | undefined | null> => {
  if (!url) return null;
  if (url.startsWith('http') && !url.includes('ogbzhbwfucgjiafhsxab.supabase.co')) {
    return url;
  }
  let path = url;
  if (url.startsWith('http')) {
    try {
      const urlObject = new URL(url);
      const pathParts = urlObject.pathname.split('/avatars/');
      if (pathParts.length > 1) {
        path = pathParts[1];
      } else {
        return url;
      }
    } catch (e) {
      return url;
    }
  }
  const { data: signedUrlData } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 99999999);
  return signedUrlData ? signedUrlData.signedUrl : url;
};

export function useOptimizedPosts() {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['optimizedPosts'],
    queryFn: async ({ pageParam = 0 }) => {
      const startIndex = pageParam * POSTS_PER_PAGE;

      // Fetch only the media URLs separately to avoid slow queries
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(
          `
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
          likes(user_id)
        `
        )
        .order('created_at', { ascending: false })
        .range(startIndex, startIndex + POSTS_PER_PAGE - 1);

      if (postsError) throw postsError;

      // Fetch media separately with optimization
      const postsWithMedia = await Promise.all(
        postsData.map(async (post: any) => {
          const { data: mediaData } = await supabase
            .from('post_media')
            .select('media_url, media_type, order_index')
            .eq('post_id', post.id)
            .order('order_index', { ascending: true });

          return {
            ...post,
            post_media: mediaData || [],
          };
        })
      );

      // Process URLs in parallel
      const processedData = await Promise.all(
        postsWithMedia.map(async (post: any) => {
          const avatarUrl = await processUrl(post.profiles?.avatar_url);
          const sortedMedia = (post.post_media || []).sort(
            (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
          );

          return {
            id: post.id,
            content: post.caption || '',
            location: post.location,
            created_at: post.created_at,
            likes: post.likes_count || 0,
            likes_count: post.likes_count || 0,
            comments: post.comments_count || 0,
            comments_count: post.comments_count || 0,
            isLiked: post.likes.some(
              (like: { user_id: string }) => like.user_id === user?.id
            ),
            isBookmarked: false,
            image_url: sortedMedia[0]?.media_url,
            media_type: sortedMedia[0]?.media_type,
            media: sortedMedia,
            user: {
              username: post.profiles?.username || '',
              displayName:
                post.profiles?.display_name || post.profiles?.username || '',
              avatar: avatarUrl || '',
            },
            user_id: post.user_id,
            user_id_str: post.user_id,
          };
        })
      );

      return {
        posts: processedData,
        nextPage: processedData.length === POSTS_PER_PAGE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}

// Optimized hook for single post detail
export function usePostDetail(postId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['postDetail', postId],
    queryFn: async () => {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select(
          `
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
            media_type,
            order_index
          ),
          likes(user_id)
        `
        )
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      const avatarUrl = await processUrl(post.profiles?.avatar_url);
      const sortedMedia = (post.post_media || []).sort(
        (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
      );

      return {
        id: post.id,
        content: post.caption || '',
        location: post.location,
        created_at: post.created_at,
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        isLiked: post.likes.some(
          (like: { user_id: string }) => like.user_id === user?.id
        ),
        isBookmarked: false,
        image_url: sortedMedia[0]?.media_url,
        media_type: sortedMedia[0]?.media_type,
        media: sortedMedia,
        user: {
          username: post.profiles?.username || '',
          displayName:
            post.profiles?.display_name || post.profiles?.username || '',
          avatar: avatarUrl || '',
        },
        user_id: post.user_id,
      };
    },
    enabled: !!postId,
  });
}
