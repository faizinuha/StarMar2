import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useViews(postId: string) {
  const queryClient = useQueryClient();
  const viewTrackedRef = useRef<boolean>(false);

  const { user } = useAuth();

  const { data: views = 0 } = useQuery({
    queryKey: ['views', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('views_count')
        .eq('id', postId)
        .single();

      if (error) {
        console.error('Error fetching views:', error);
        return 0;
      }

      return data?.views_count || 0;
    },
  });

  const incrementViewMutation = useMutation({
    mutationFn: async () => {
      // Use viewer id for logged-in users, otherwise use a session id stored in localStorage
      const getSessionId = () => {
        try {
          let sid = localStorage.getItem('sm_session_id');
          if (!sid) {
            sid = (crypto && (crypto as any).randomUUID && (crypto as any).randomUUID()) || `${Date.now()}-${Math.floor(Math.random()*1e6)}`;
            localStorage.setItem('sm_session_id', sid);
          }
          return sid;
        } catch (e) {
          return `${Date.now()}-${Math.floor(Math.random()*1e6)}`;
        }
      };

      let res;
      if (user?.id) {
        res = await supabase.rpc('increment_view', { p_post_id: postId, p_viewer_id: user.id });
      } else {
        const sessionId = getSessionId();
        res = await supabase.rpc('increment_view', { p_post_id: postId, p_session_id: sessionId });
      }

      const { error } = res as any;
      if (error) {
        console.error('Error incrementing views:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['views', postId] });
    },
  });

  const trackView = useCallback(() => {
    if (!viewTrackedRef.current) {
      viewTrackedRef.current = true;
      incrementViewMutation.mutate();
    }
  }, [incrementViewMutation]);

  return {
    views,
    trackView,
    isLoading: incrementViewMutation.isPending,
  };
}

// Helper function to format view counts
export const formatViews = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};
