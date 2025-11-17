import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export interface ConversationMember {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

export interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  last_message_at: string;
  last_message: string | null;
  last_message_sender: string | null;
  members: ConversationMember[];
  unread_count: number;
}

export const useConversations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          *,
          conversation_members(
            user_id,
            last_read_at
          ),
          messages(
            content,
            sender_id,
            created_at
          )
        `
        )
        .order('last_message_at', { ascending: false })
        .order('created_at', { foreignTable: 'messages', ascending: false })
        .limit(1, { foreignTable: 'messages' });

      if (error) throw error;

      // Transform data to include members and unread count
      const conversationsWithMembers = await Promise.all(
        data.map(async (conv: any) => {
          // Get all members' profiles
          const memberIds = conv.conversation_members.map(
            (m: any) => m.user_id
          );
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', memberIds);

          // Get last message
          const lastMessage = conv.messages?.[0];

          // Calculate unread count
          const userMember = conv.conversation_members.find(
            (m: any) => m.user_id === user.id
          );
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .gt(
              'created_at',
              userMember?.last_read_at || new Date(0).toISOString()
            );

          return {
            id: conv.id,
            name: conv.name,
            is_group: conv.is_group,
            created_at: conv.created_at,
            last_message_at: conv.last_message_at,
            last_message: lastMessage?.content || null,
            last_message_sender: lastMessage?.sender_id || null,
            members: profiles || [],
            unread_count: unreadCount || 0,
          };
        })
      );

      return conversationsWithMembers as Conversation[];
    },
    enabled: !!user,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['conversations', user.id],
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['conversations', user.id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const totalUnread = conversations.reduce(
    (sum, conv) => sum + conv.unread_count,
    0
  );

  return {
    conversations,
    isLoading,
    totalUnread,
  };
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ otherUserId }: { otherUserId: string }) => {
      const { data, error } = await supabase.rpc(
        'get_or_create_direct_conversation',
        {
          other_user_id: otherUserId,
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};
