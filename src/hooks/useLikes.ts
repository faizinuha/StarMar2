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
        // Defensive: do not attempt to like without an entity id
        throw new Error(`Invalid ${entity} id: ${String(entityId)}`);
      }

      // Basic UUID validation to prevent sending empty strings or incorrect ids
      const uuidRegex =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(entityId)) {
        throw new Error(`Invalid ${entity} id format: ${entityId}`);
      }

      const currentlyLiked = isLiked;
      const column = `${entity}_id`;

      // Optimistic update
      setIsLiked(!currentlyLiked);
      setLikesCount((prev) =>
        currentlyLiked ? Math.max(0, prev - 1) : prev + 1
      );

      // Use toggle_like RPC function for both like and unlike operations
      const params: any = { p_user_id: user.id };
      if (entity === 'post') params.p_post_id = entityId;
      else if (entity === 'meme') params.p_meme_id = entityId;
      else if (entity === 'comment') params.p_comment_id = entityId;

      try {
        const { data: toggleResult, error: rpcError } = await supabase.rpc('toggle_like', params);
        if (rpcError) throw rpcError;

        // Create notification if liked (not unliked) and not liking own content
        if (toggleResult === true && ownerId && ownerId !== user.id) {
          const notificationData: any = {
            user_id: ownerId,
            from_user_id: user.id,
            type: 'like',
          };
          
          if (entity === 'post') notificationData.post_id = entityId;
          else if (entity === 'meme') notificationData.meme_id = entityId;
          else if (entity === 'comment') notificationData.comment_id = entityId;

          await supabase.from('notifications').insert(notificationData);
        }
      } catch (err: any) {
        // Revert optimistic update
        setIsLiked(currentlyLiked);
        setLikesCount((prev) =>
          currentlyLiked ? prev + 1 : Math.max(0, prev - 1)
        );
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
