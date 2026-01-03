import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  media_type?: string;
  created_at: string;
  likes: number;
  likes_count: number;
  comments: number;
  isLiked: boolean;
  isBookmarked: boolean;
  location?: string;
  is_repost?: boolean;
  original_post?: Omit<Post, 'comments_count' | 'likes_count' | 'isLiked' | 'isBookmarked' | 'profiles'>;
  comments_count: number;
  media?: Array<{
    media_url: string;
    media_type: string;
    order_index?: number;
  }>;
  user: {
    username: string;
    displayName: string;
    avatar: string;
    is_verified?: string | null;
  };
  profiles?: any;
}

export function useCreatePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      selectedImage,
      location,
    }: {
      content: string;
      selectedImage: File | null;
      location: string;
    }) => {
      if (!user) {
        throw new Error('You must be logged in to create a post.');
      }

      if (!content.trim() && !selectedImage) {
        throw new Error('Post content or an image is required.');
      }

      // 1. Insert the post to get its ID
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: content.trim(),
          location: location || null,
          likes_count: 0, // Explicitly set default value
          comments_count: 0, // Explicitly set default value
        })
        .select()
        .single();

      if (postError) {
        throw new Error(`Failed to create post: ${postError.message}`);
      }

      const postId = post.id;

      // 2. Upload image if it exists and link it
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, selectedImage);

        if (uploadError) {
          console.error(
            'Image upload failed, but post was created.',
            uploadError
          );
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('posts')
            .getPublicUrl(filePath);

          const { error: mediaError } = await supabase
            .from('post_media')
            .insert({
              post_id: postId,
              media_url: publicUrlData.publicUrl,
              media_type: selectedImage.type,
            });
          if (mediaError) {
            console.error('Failed to link media to post:', mediaError);
          }
        }
      }

      // 3. Handle hashtags client-side
      if (content) {
        const hashtagRegex = /#(\w+)/g;
        const hashtags =
          content
            .match(hashtagRegex)
            ?.map((tag) => tag.substring(1).toLowerCase()) || [];
        const uniqueHashtags = [...new Set(hashtags)];

        if (uniqueHashtags.length > 0) {
          try {
            const upsertedTags = await Promise.all(
              uniqueHashtags.map(async (tag) => {
                const { data: hashtagData, error: upsertError } = await supabase
                  .from('hashtags')
                  .upsert({ name: tag }, { onConflict: 'name' })
                  .select('id')
                  .single();
                if (upsertError) throw upsertError;
                return hashtagData;
              })
            );

            const postHashtagRelations = upsertedTags.map((tag) => ({
              post_id: postId,
              hashtag_id: tag.id,
            }));

            const { error: relationError } = await supabase
              .from('post_hashtags')
              .insert(postHashtagRelations);

            if (relationError) throw relationError;
          } catch (e) {
            console.error('Error processing hashtags:', e);
          }
        }
      }

      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPosts'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts', user?.id] });
    },
  });
}

const POST_SELECT_QUERY = `
  id,
  user_id,
  caption,
  location,
  created_at,
  likes_count,
  comments_count,
  is_repost,
  original_post_id,
  profiles!posts_user_id_fkey (
    username,
    display_name,
    avatar_url,
    is_verified
  ),
  post_media (
    media_url,
    media_type,
    order_index
  ),
  likes(user_id),
  original_post:posts!original_post_id (
    id,
    caption,
    user_id,
    created_at,
    post_media (
      media_url,
      media_type,
      order_index
    ),
    profiles!posts_user_id_fkey (
      username,
      display_name,
      avatar_url,
      is_verified
    )
  )
`;

export function useUserPosts(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['userPosts', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('No user ID provided');

      const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT_QUERY)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return await processPostsData(data, user?.id);
    },
    enabled: !!targetUserId,
  });
}

export function useAllPosts() {
  const { user } = useAuth();

  return useQuery({
    refetchInterval: 5000,
    queryKey: ['allPosts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT_QUERY)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return await processPostsData(data, user?.id);
    },
  });
}

// Helper to process post data (URL signing, sorting media, nested original post)
async function processPostsData(data: any[], currentUserId?: string): Promise<Post[]> {
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
        path = pathParts.length > 1 ? pathParts[1] : url;
      } catch (e) {
        return url;
      }
    }
    const { data: signedUrlData } = await supabase.storage.from('avatars').createSignedUrl(path, 99999999);
    return signedUrlData ? signedUrlData.signedUrl : url;
  };

  return await Promise.all(
    data.map(async (post: any) => {
      const avatarUrl = await processUrl(post.profiles?.avatar_url);
      const sortedMedia = (post.post_media || []).sort(
        (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
      );

      // Process original post if it exists
      let originalPostProcessed = undefined;
      if (post.original_post) {
         const op = post.original_post;
         const opAvatarUrl = await processUrl(op.profiles?.avatar_url);
         const opSortedMedia = (op.post_media || []).sort(
           (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
         );
         originalPostProcessed = {
            id: op.id,
            content: op.caption || '',
            created_at: op.created_at,
            likes: 0, // Default for original post in repost
            comments: 0, // Default for original post in repost
            user_id: op.user_id,
            image_url: opSortedMedia[0]?.media_url,
            media_type: opSortedMedia[0]?.media_type,
            media: opSortedMedia,
            user: {
              username: op.profiles?.username || '',
              displayName: op.profiles?.display_name || op.profiles?.username || '',
              avatar: opAvatarUrl || '',
              is_verified: op.profiles?.is_verified || null,
            },
         };
      }

      return {
        id: post.id,
        content: post.caption || '',
        location: post.location,
        created_at: post.created_at,
        likes: post.likes_count || 0,
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0, // Add comments_count here
        comments: post.comments_count || 0,
        isLiked: post.likes.some((like: { user_id: string }) => like.user_id === currentUserId),
        isBookmarked: false,
        image_url: sortedMedia[0]?.media_url,
        media_type: sortedMedia[0]?.media_type,
        media: sortedMedia,
        is_repost: post.is_repost,
        original_post: originalPostProcessed,
        user: {
          username: post.profiles?.username || '',
          displayName: post.profiles?.display_name || post.profiles?.username || '',
          avatar: avatarUrl || '',
          is_verified: post.profiles?.is_verified || null,
        },
        user_id: post.user_id,
        profiles: post.profiles,
      };
    })
  );
}

export function useTogglePostLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      isLiked,
    }: {
      postId: string;
      isLiked: boolean;
    }) => {
      if (!user) throw new Error('User not authenticated');

      if (isLiked) {
        // Unlike post
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (error) throw error;

        // Decrement likes_count in posts table
        await supabase.rpc('decrement_likes_count', { post_id: postId });
      } else {
        // Like post
        const { error } = await supabase.from('likes').insert({
          user_id: user.id,
          post_id: postId,
        });

        if (error) throw error;

        // Increment likes_count in posts table
        await supabase.rpc('increment_likes_count', { post_id: postId });
      }

      return true;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refetch posts with updated like status and count
      queryClient.invalidateQueries({ queryKey: ['allPosts'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] }); // Invalidate single post query if exists
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPosts'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
    }: {
      postId: string;
      content: string;
    }) => {
      // 1. Update the post content
      const { data: post, error: postError } = await supabase
        .from('posts')
        .update({ caption: content })
        .eq('id', postId)
        .select()
        .single();

      if (postError) {
        console.error('Error updating post:', postError);
        throw postError;
      }

      // --- START CLIENT-SIDE HASHTAG SYNCING ---
      try {
        // First, delete all existing hashtag relations for this post
        const { error: deleteError } = await supabase
          .from('post_hashtags')
          .delete()
          .eq('post_id', postId);
        if (deleteError) throw deleteError;

        // Now, add the new ones
        const hashtagRegex = /#(\w+)/g;
        const hashtags =
          content
            .match(hashtagRegex)
            ?.map((tag) => tag.substring(1).toLowerCase()) || [];
        const uniqueHashtags = [...new Set(hashtags)];

        if (uniqueHashtags.length > 0) {
          const upsertedTags = await Promise.all(
            uniqueHashtags.map(async (tag) => {
              const { data: hashtagData, error: upsertError } = await supabase
                .from('hashtags')
                .upsert({ name: tag }, { onConflict: 'name' })
                .select('id')
                .single();
              if (upsertError) throw upsertError;
              return hashtagData;
            })
          );

          const postHashtagRelations = upsertedTags.map((tag) => ({
            post_id: postId,
            hashtag_id: tag.id,
          }));

          const { error: relationError } = await supabase
            .from('post_hashtags')
            .insert(postHashtagRelations);

          if (relationError) throw relationError;
        }
      } catch (e) {
        console.error('Error syncing hashtags during update:', e);
      }
      // --- END CLIENT-SIDE HASHTAG SYNCING ---

      return post;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allPosts'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
    },
  });
}

export function usePostById(postId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) throw new Error('No post ID provided');

      const { data, error } = await supabase
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
          is_repost,
          original_post_id,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url,
            is_verified
          ),
          post_media (
            media_url,
            media_type,
            order_index
          ),
          likes(user_id),
          original_post:posts!original_post_id (
            id,
            caption,
            user_id,
            created_at,
            post_media (
               media_url,
               media_type
            ),
            profiles!posts_user_id_fkey (
               username,
               display_name,
               avatar_url
            )
          )
        `
        )
        .eq('id', postId)
        .single();

      if (error) throw error;

      return (await processPostsData([data], user?.id))[0];
    },
    enabled: !!postId,
  });
}
