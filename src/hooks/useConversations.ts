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
  avatar_url: string | null;
  created_at: string;
  last_message_at: string;
  last_message: string | null;
  last_message_sender: string | null;
  members: ConversationMember[];
  unread_count: number;
  created_by?: string;
}

export const useConversations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        // Step 1: Get all conversations for this user
        const { data: convData, error: convError } = await supabase
          .from('conversation_members')
          .select('conversation_id, last_read_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (convError) throw convError;

        if (!convData || convData.length === 0) return [];

        // Get conversation IDs
        const conversationIds = convData.map((cm: any) => cm.conversation_id);

        // Step 2: Get all conversations details
        const { data: convDetails, error: detailsError } = await supabase
          .from('conversations')
          .select('id, name, is_group, avatar_url, created_at, last_message_at, created_by')
          .in('id', conversationIds);

        if (detailsError) throw detailsError;

        // Step 3: Get member profiles for all conversations
        const { data: allMembers, error: membersError } = await supabase
          .from('conversation_members')
          .select('conversation_id, user_id')
          .in('conversation_id', conversationIds);

        if (membersError) throw membersError;

        // Get unique member IDs
        const memberIds = [...new Set(allMembers?.map((m: any) => m.user_id) || [])];
        
        // Fetch profiles hanya jika ada memberIds
        let profiles: any[] = [];
        if (memberIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', memberIds);
          profiles = profilesData || [];
        }

        // Step 4: Get last message for each conversation
        const { data: lastMessages } = await supabase
          .from('messages')
          .select('conversation_id, content, sender_id, created_at')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false });

        // Create maps for easy lookup
        const profilesMap = new Map<string, any>();
        profiles?.forEach((p: any) => profilesMap.set(p.user_id, p));

        const membersMap = new Map<string, any[]>();
        allMembers?.forEach((m: any) => {
          if (!membersMap.has(m.conversation_id)) {
            membersMap.set(m.conversation_id, []);
          }
          const profile = profilesMap.get(m.user_id);
          membersMap.get(m.conversation_id)!.push({
            user_id: m.user_id,
            username: profile?.username || '',
            display_name: profile?.display_name || '',
            avatar_url: profile?.avatar_url || '',
          });
        });

        const lastMessagesMap = new Map<string, any>();
        lastMessages?.forEach((m: any) => {
          if (!lastMessagesMap.has(m.conversation_id)) {
            lastMessagesMap.set(m.conversation_id, m);
          }
        });

        // Step 5: Get unread counts
        const { data: unreadData } = await supabase
          .from('messages')
          .select('conversation_id, created_at')
          .in('conversation_id', conversationIds);

        // Transform data
        return convDetails?.map((conv: any) => {
          const cmData = convData.find((cm: any) => cm.conversation_id === conv.id);
          const members = membersMap.get(conv.id) || [];
          const lastMsg = lastMessagesMap.get(conv.id);
          
          const unreadCount = (unreadData || []).filter(
            (m: any) => m.conversation_id === conv.id && 
            m.created_at > (cmData?.last_read_at || new Date(0).toISOString())
          ).length;

          return {
            id: conv.id,
            name: conv.name,
            is_group: conv.is_group,
            avatar_url: conv.avatar_url ? 
              supabase.storage.from('chat-attachments').getPublicUrl(conv.avatar_url).data.publicUrl : 
              null,
            created_at: conv.created_at,
            last_message_at: conv.last_message_at,
            last_message: lastMsg?.content || null,
            last_message_sender: lastMsg?.sender_id || null,
            members: members,
            unread_count: unreadCount,
            created_by: conv.created_by,
          };
        }) as Conversation[];
      } catch (error: any) {
        console.error('Failed to fetch conversations:', error.message);
        return [];
      }
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
