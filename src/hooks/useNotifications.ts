import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const [{ count: standardCount }, { count: systemCount }] = await Promise.all([
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
        supabase
          .from('user_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
      ]);

      return (standardCount || 0) + (systemCount || 0);
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const deleteNotification = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'standard' | 'system' }) => {
      const table = type === 'standard' ? 'notifications' : 'user_notifications';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'standard' | 'system' }) => {
      const table = type === 'standard' ? 'notifications' : 'user_notifications';
      const { error } = await supabase.from(table).update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  return {
    unreadCount,
    deleteNotification,
    markAsRead,
  };
};
