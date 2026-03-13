import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

export function useViews(postId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const viewTrackedRef = useRef<boolean>(false);

  const { data: views = 0 } = useQuery({
    queryKey: ['views', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('views_count')
        .eq('id', postId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching views:', error);
        return 0;
      }

      return (data as any)?.views_count || 0;
    },
  });

  const incrementViewMutation = useMutation({
    mutationFn: async () => {
      // Use increment_view RPC which prevents duplicate views per user/session
      const sessionId = `anon-${Math.random().toString(36).slice(2)}`;
      
      const { error } = await supabase.rpc('increment_view', {
        p_post_id: postId,
        p_viewer_id: user?.id || undefined,
        p_session_id: !user ? sessionId : undefined,
      });

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
