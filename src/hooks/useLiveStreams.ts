import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  genre: string;
  is_active: boolean;
  viewer_count: number;
  started_at: string;
  ended_at: string | null;
  user?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useActiveStreams() {
  return useQuery({
    queryKey: ['live-streams'],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*, profiles!live_streams_user_id_fkey(username, display_name, avatar_url)')
        .eq('is_active', true)
        .order('started_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((s: any) => ({
        ...s,
        genre: s.genre || 'General',
        user: s.profiles ? {
          username: s.profiles.username,
          display_name: s.profiles.display_name,
          avatar_url: s.profiles.avatar_url,
        } : null,
      })) as LiveStream[];
    },
  });
}

export function useStreamHistory(userId?: string) {
  return useQuery({
    queryKey: ['stream-history', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*, profiles!live_streams_user_id_fkey(username, display_name, avatar_url)')
        .eq('user_id', userId!)
        .eq('is_active', false)
        .order('ended_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map((s: any) => ({
        ...s,
        genre: s.genre || 'General',
        user: s.profiles ? {
          username: s.profiles.username,
          display_name: s.profiles.display_name,
          avatar_url: s.profiles.avatar_url,
        } : null,
      })) as LiveStream[];
    },
  });
}

export function useCreateStream() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, description, genre }: { title: string; description?: string; genre?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          genre: genre || 'General',
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Send notification to followers
      try {
        const { data: followers } = await supabase
          .from('followers')
          .select('follower_id')
          .eq('following_id', user.id);

        if (followers && followers.length > 0) {
          const notifications = followers.map(f => ({
            user_id: f.follower_id,
            from_user_id: user.id,
            type: 'live_started',
            post_id: null,
          }));
          await supabase.from('notifications').insert(notifications);
        }
      } catch (e) {
        console.error('Failed to send live notifications:', e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}

export function useEndStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (streamId: string) => {
      const { error } = await supabase
        .from('live_streams')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', streamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}
