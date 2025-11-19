import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useFavoriteConversations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorite-conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('favorite_conversations')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(f => f.conversation_id);
    },
    enabled: !!user,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Not authenticated');

      const isFavorite = favorites.includes(conversationId);

      if (isFavorite) {
        const { error } = await supabase
          .from('favorite_conversations')
          .delete()
          .eq('user_id', user.id)
          .eq('conversation_id', conversationId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorite_conversations')
          .insert({
            user_id: user.id,
            conversation_id: conversationId,
          });

        if (error) throw error;
      }

      return !isFavorite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorite: (conversationId: string) => favorites.includes(conversationId),
  };
};

export const useFavoriteUsers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorite-users', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('favorite_users')
        .select(`
          favorite_user_id,
          profiles:favorite_user_id (
            user_id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (favoriteUserId: string) => {
      if (!user) throw new Error('Not authenticated');

      const isFavorite = favorites.some(f => f.favorite_user_id === favoriteUserId);

      if (isFavorite) {
        const { error } = await supabase
          .from('favorite_users')
          .delete()
          .eq('user_id', user.id)
          .eq('favorite_user_id', favoriteUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorite_users')
          .insert({
            user_id: user.id,
            favorite_user_id: favoriteUserId,
          });

        if (error) throw error;
      }

      return !isFavorite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-users'] });
    },
  });

  return {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorite: (userId: string) => favorites.some(f => f.favorite_user_id === userId),
  };
};
