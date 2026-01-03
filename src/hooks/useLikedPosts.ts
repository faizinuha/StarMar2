import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

type LikeableEntity = 'post' | 'comment' | 'meme';

export function useLikes(entity: LikeableEntity, entityId: string | undefined, ownerId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLikeUpdate = useCallback(
    (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      if (eventType === 'INSERT') {
        setLikesCount((prev) => prev + 1);
        if (user && newRecord.user_id === user.id) {
          setIsLiked(true);
        }
      } else if (eventType === 'DELETE') {
        setLikesCount((prev) => Math.max(0, prev - 1));
        if (user && oldRecord.user_id === user.id) {
          setIsLiked(false);
        }
      }
    },
    [user]
  );

  useEffect(() => {
    if (!entityId) return;

    const fetchInitialState = async () => {
      setLoading(true);

      const { count, error: countError } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq(`${entity}_id`, entityId);

      if (countError) {
        console.error('Error fetching likes count:', countError);
      } else {
        setLikesCount(count ?? 0);
      }

      if (user) {
        const { data: likeData, error: likeError } = await supabase
          .from('likes')
          .select('id')
          .eq(`${entity}_id`, entityId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (likeError) {
          console.error('Error fetching like status:', likeError);
        } else {
          setIsLiked(!!likeData);
        }
      }
      setLoading(false);
    };

    fetchInitialState();

    const subscription = supabase
      .channel(`likes:${entity}:${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `${entity}_id=eq.${entityId}`,
        },
        handleLikeUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [entity, entityId, user, handleLikeUpdate]);

  const { mutate: toggleLike } = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('You must be logged in to like.');
      }

      if (!entityId) {
        throw new Error(`Invalid ${entity} id: ${String(entityId)}`);
      }

      const uuidRegex =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(entityId)) {
        throw new Error(`Invalid ${entity} id format: ${entityId}`);
      }

      const currentlyLiked = isLiked;
      
      // Optimistic update
      setIsLiked(!currentlyLiked);
      setLikesCount((prev) => (currentlyLiked ? Math.max(0, prev - 1) : prev + 1));

      const params: any = { p_user_id: user.id };
      if (entity === 'post') params.p_post_id = entityId;
      else if (entity === 'meme') params.p_meme_id = entityId;
      else if (entity === 'comment') params.p_comment_id = entityId;

      try {
        const { data: toggleResult, error: rpcError } = await supabase.rpc('toggle_like', params);
        if (rpcError) throw rpcError;

        // Jika postingan di-like, panggil edge function untuk menangani pembuatan notifikasi
        if (toggleResult === true && entity === 'post' && entityId && user && ownerId && ownerId !== user.id) {
          // Kita tidak perlu menunggu (await) ini, biarkan berjalan di background
          supabase.functions.invoke('create-notification-on-like', {
            body: {
              post_id: entityId,
              liker_id: user.id,
            },
          }).catch(err => {
            // Catat error jika pemanggilan fungsi gagal, tapi jangan blokir UI
            console.error('Error invoking notification function:', err);
          });
        }
      } catch (err: any) {
        // Kembalikan pembaruan optimis jika terjadi kesalahan
        setIsLiked(currentlyLiked);
        setLikesCount((prev) => (currentlyLiked ? prev + 1 : Math.max(0, prev - 1)));
        console.error('Error toggling like:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entity, 'list'] });
      queryClient.invalidateQueries({ queryKey: [entity, entityId] });
    },
  });

  return { likesCount, isLiked, toggleLike, loading };
}

import { useQuery } from '@tanstack/react-query';

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
          post_media (media_url, media_type, order_index),
          profiles!posts_user_id_fkey (username, display_name, avatar_url)
        `)
        .in('id', postIds);

      if (postsError) throw postsError;

      return (posts || []).map(post => {
        const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
        const media = (post.post_media || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
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
          isLiked: true,
          isBookmarked: false,
        };
      });
    },
    enabled: !!targetUserId,
  });
};