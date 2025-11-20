import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  attachment_url?: string;
  attachment_type?: string;
  parent_message_id?: string | null;
  parent_message?: Message | null;
  sender: {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

export const useMessages = (conversationId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      try {
        // Fetch messages tanpa join
        const { data: messagesData, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Get unique sender IDs
        const senderIds = [...new Set(messagesData.map((m: any) => m.sender_id))];
        
        // Get unique parent message IDs
        const parentMessageIds = messagesData
          .map((m: any) => m.parent_message_id)
          .filter((id): id is string => !!id);

        // Fetch sender profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', senderIds);

        // Fetch parent messages if any
        let parentMessagesMap = new Map<string, any>();
        if (parentMessageIds.length > 0) {
          const { data: parentMessages } = await supabase
            .from('messages')
            .select('*')
            .in('id', parentMessageIds);

          parentMessages?.forEach((m: any) => parentMessagesMap.set(m.id, m));
        }

        // Create profiles map
        const profilesMap = new Map<string, any>();
        profiles?.forEach((p: any) => profilesMap.set(p.user_id, p));

        const messagesWithSender = messagesData.map((msg: any) => {
          const profile = profilesMap.get(msg.sender_id);
          return {
            ...msg,
            sender: profile || {
              user_id: msg.sender_id,
              username: 'Anonymous',
              display_name: 'Anonymous',
              avatar_url: '',
            },
            parent_message: msg.parent_message_id ? parentMessagesMap.get(msg.parent_message_id) : null,
          };
        });

        return messagesWithSender as Message[];
      } catch (error: any) {
        console.error('Failed to fetch messages:', error.message);
        return [];
      }
    },
    enabled: !!conversationId,
  });

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Mark messages as read
  useEffect(() => {
    if (!conversationId || !user) return;

    const markAsRead = async () => {
      await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    };

    markAsRead();
  }, [conversationId, user, messages.length]);

  return {
    messages,
    isLoading,
  };
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      file,
      parentMessageId,
    }: {
      conversationId: string;
      content: string;
      file?: File;
      parentMessageId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;

      try {
        // Upload file if provided
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${conversationId}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          attachmentUrl = fileName;
          attachmentType = file.type;
        }

        // Send message with attachment
        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: content || '',
            attachment_url: attachmentUrl,
            attachment_type: attachmentType,
            parent_message_id: parentMessageId || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Update conversation last_message_at
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);

        if (updateError) throw updateError;

        return message;
      } catch (error: any) {
        console.error('Failed to send message:', error.message);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      console.error('Message send error:', error.message);
    },
  });
};
