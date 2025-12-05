import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useCreateGroup = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, memberIds }: { name: string; memberIds: string[] }) => {
      if (!user) throw new Error('Not authenticated');

      try {
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

        if (convError) {
          console.error('Error creating conversation:', convError);
          throw convError;
        }

        // Add creator as member + selected members
        const members = [user.id, ...memberIds];
        console.log('Adding members to group:', members);
        
        const { error: membersError } = await supabase
          .from('conversation_members')
          .insert(
            members.map(memberId => ({
              conversation_id: conversation.id,
              user_id: memberId,
            }))
          );

        if (membersError) {
          console.error('Error adding members:', membersError);
          throw membersError;
        }

        console.log('Group created successfully:', conversation.id);
        return conversation.id;
      } catch (error: any) {
        console.error('Create group error:', error);
        throw error;
      }
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Grup berhasil dibuat!');
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      toast.error(`Gagal membuat grup: ${error.message}`);
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

      try {
        // Validate file
        if (!file) throw new Error('File tidak dipilih');
        
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          throw new Error('Ukuran file maksimal 5MB');
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          throw new Error('Format file harus JPEG, PNG, atau WebP');
        }

        console.log('Uploading avatar for conversation:', conversationId);

        // Upload to storage in users/{conversationId} folder
        const fileExt = file.name.split('.').pop();
        const fileName = `users/${conversationId}/avatar-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, file, { upsert: true });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        console.log('Avatar uploaded to:', fileName);

        // Update conversations table with avatar_url
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ avatar_url: fileName })
          .eq('id', conversationId);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw updateError;
        }

        console.log('Conversation avatar updated in database');

        return {
          path: fileName,
          success: true,
        };
      } catch (error: any) {
        console.error('Update avatar error:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Avatar grup berhasil diubah');
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      toast.error(`Gagal mengubah avatar: ${error.message}`);
    },
  });
};

export const useGetGroupMembers = (conversationId: string | undefined) => {
  return useQuery({
    queryKey: ['group-members', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      try {
        // Fetch conversation members tanpa join
        const { data: members, error } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', conversationId);

        if (error) throw error;

        if (!members || members.length === 0) return [];

        // Fetch profiles
        const memberIds = members.map((m: any) => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', memberIds);

        // Create map and return
        const profilesMap = new Map<string, any>();
        profiles?.forEach((p: any) => profilesMap.set(p.user_id, p));

        return members.map((m: any) => {
          const profile = profilesMap.get(m.user_id);
          return {
            user_id: m.user_id,
            username: profile?.username || '',
            display_name: profile?.display_name || '',
            avatar_url: profile?.avatar_url || '',
          };
        });
      } catch (error: any) {
        console.error('Failed to fetch group members:', error.message);
        return [];
      }
    },
    enabled: !!conversationId,
  });
};

// Get followed users only
export const useFollowedUsers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['followed-users', user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        const { data, error } = await supabase
          .from('followers')
          .select(`
            following_id,
            following:following_id(
              user_id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('follower_id', user.id);

        if (error) {
          console.warn('Error fetching followed users:', error);
          // Return empty array if table doesn't exist
          if (error.code === 'PGRST204' || error.code === 'PGRST404') {
            return [];
          }
          throw error;
        }

        return data?.map((item: any) => ({
          user_id: item.following_id,
          username: item.following?.username || '',
          display_name: item.following?.display_name || '',
          avatar_url: item.following?.avatar_url || '',
        })) || [];
      } catch (error: any) {
        console.warn('Failed to fetch followed users:', error.message);
        // Gracefully return empty array
        return [];
      }
    },
    enabled: !!user,
  });
};

// Delete group (admin only) - delete semua data yang berhubungan
export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Verify user is admin
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('created_by')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;
      if (conv.created_by !== user.id) throw new Error('Only admin can delete group');

      // Delete all related data (cascade will handle most)
      // But explicitly delete to ensure:
      
      // 1. Delete group invitations
      const { error: invError } = await supabase
        .from('group_invitations' as any)
        .delete()
        .eq('conversation_id', conversationId);

      if (invError && !(invError as any).message?.includes('No rows found')) throw invError;

      // 2. Delete messages
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (msgError && !msgError.message.includes('No rows found')) throw msgError;

      // 3. Delete conversation members
      const { error: memberError } = await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId);

      if (memberError && !memberError.message.includes('No rows found')) throw memberError;

      // 4. Delete conversation
      const { error: delError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (delError) throw delError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Grup berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(`Gagal menghapus grup: ${error.message}`);
    },
  });
};
