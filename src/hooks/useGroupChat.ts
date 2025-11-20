import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useCreateGroup = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, memberIds }: { name: string; memberIds: string[] }) => {
      if (!user) throw new Error('Not authenticated');

      // Create group conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          name,
          is_group: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add creator as member
      const members = [user.id, ...memberIds];
      const { error: membersError } = await supabase
        .from('conversation_members')
        .insert(
          members.map(memberId => ({
            conversation_id: conversation.id,
            user_id: memberId,
          }))
        );

      if (membersError) throw membersError;

      return conversation.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useAddGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      const { error } = await supabase
        .from('conversation_members')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      const { error } = await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useUpdateGroupName = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, name }: { conversationId: string; name: string }) => {
      const { error } = await supabase
        .from('conversations')
        .update({ name })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useUpdateGroupAvatar = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, file }: { conversationId: string; file: File }) => {
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${conversationId}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error } = await supabase
        .from('conversations')
        .update({ avatar_url: fileName })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useGetGroupMembers = (conversationId: string | undefined) => {
  return useQuery({
    queryKey: ['group-members', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('conversation_members')
        .select(`
          user_id,
          profiles:user_id (
            user_id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId);

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
};
