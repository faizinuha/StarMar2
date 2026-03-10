import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

export function useViews(postId: string) {
  const queryClient = useQueryClient();
  const viewTrackedRef = useRef<boolean>(false);

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
      const { error } = await supabase.rpc('increment_views_count', {
        post_id: postId,
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
