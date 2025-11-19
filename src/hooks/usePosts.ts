import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Post {
  comments_count: number;
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
  media?: Array<{ media_url: string; media_type: string; order_index?: number }>;
  user: {
    username: string;
    displayName: string;
    avatar: string;
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
          console.error('Image upload failed, but post was created.', uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('posts')
            .getPublicUrl(filePath);

          const { error: mediaError } = await supabase.from('post_media').insert({
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
        const hashtags = content.match(hashtagRegex)?.map(tag => tag.substring(1).toLowerCase()) || [];
        const uniqueHashtags = [...new Set(hashtags)];

        if (uniqueHashtags.length > 0) {
          try {
            const upsertedTags = await Promise.all(uniqueHashtags.map(async (tag) => {
              const { data: hashtagData, error: upsertError } = await supabase
                .from('hashtags')
                .upsert({ name: tag }, { onConflict: 'name' })
                .select('id')
                .single();
              if (upsertError) throw upsertError;
              return hashtagData;
            }));

            const postHashtagRelations = upsertedTags.map(tag => ({
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

export function useUserPosts(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['userPosts', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('No user ID provided');

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
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

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

      const processedData = await Promise.all(data.map(async (post: any) => {
        const avatarUrl = await processUrl(post.profiles?.avatar_url);
        const sortedMedia = (post.post_media || []).sort((a: any, b: any) => 
          (a.order_index || 0) - (b.order_index || 0)
        );
        return {
            id: post.id,
            content: post.caption || '',
            location: post.location,
            created_at: post.created_at,
            likes: post.likes_count || 0,
            likes_count: post.likes_count || 0,
            comments: post.comments_count || 0,
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
            profiles: post.profiles,
        }
      }));

      return processedData as Post[];
    },
    enabled: !!targetUserId,
  });
}

export function useAllPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['allPosts'],
    queryFn: async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;

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

      const processedData = await Promise.all(data.map(async (post: any) => {
        const avatarUrl = await processUrl(post.profiles?.avatar_url);
        const sortedMedia = (post.post_media || []).sort((a: any, b: any) => 
          (a.order_index || 0) - (b.order_index || 0)
        );
        return {
            id: post.id,
            content: post.caption || '',
            location: post.location,
            created_at: post.created_at,
            likes: post.likes_count || 0,
            likes_count: post.likes_count || 0,
            comments: post.comments_count || 0,
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
            profiles: post.profiles,
        }
      }));
      return processedData as Post[];
    },
  });
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
        const hashtags = content.match(hashtagRegex)?.map(tag => tag.substring(1).toLowerCase()) || [];
        const uniqueHashtags = [...new Set(hashtags)];

        if (uniqueHashtags.length > 0) {
          const upsertedTags = await Promise.all(uniqueHashtags.map(async (tag) => {
            const { data: hashtagData, error: upsertError } = await supabase
              .from('hashtags')
              .upsert({ name: tag }, { onConflict: 'name' })
              .select('id')
              .single();
            if (upsertError) throw upsertError;
            return hashtagData;
          }));

          const postHashtagRelations = upsertedTags.map(tag => ({
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
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url
          ),
          post_media (
            media_url,
            media_type
          ),
          likes(user_id)
        `
        )
        .eq('id', postId)
        .single();

      if (error) throw error;

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

      const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      const avatarUrl = await processUrl(profile?.avatar_url);
      const sortedMedia = (data.post_media || []).sort((a: any, b: any) => 
        (a.order_index || 0) - (b.order_index || 0)
      );

      return {
        id: data.id,
        content: data.caption || '',
        location: data.location,
        created_at: data.created_at,
        likes: data.likes_count || 0,
        likes_count: data.likes_count || 0,
        comments: data.comments_count || 0,
        isLiked: data.likes.some(
          (like: { user_id: string }) => like.user_id === user?.id
        ),
        isBookmarked: false,
        image_url: sortedMedia[0]?.media_url,
        media_type: sortedMedia[0]?.media_type,
        media: sortedMedia,
        user: {
          username: profile?.username || '',
          displayName: profile?.display_name || profile?.username || '',
          avatar: avatarUrl || '',
        },
        user_id: data.user_id,
        profiles: data.profiles,
      } as Post;
    },
    enabled: !!postId,
  });
}