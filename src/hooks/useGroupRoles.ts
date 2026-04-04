import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type GroupRole = 'admin' | 'moderator' | 'member';

interface GroupRoleEntry {
  id: string;
  conversation_id: string;
  user_id: string;
  role: GroupRole;
  assigned_by: string | null;
}

export function useGroupRoles(conversationId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['group-roles', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('group_roles')
        .select('*')
        .eq('conversation_id', conversationId);
      if (error) throw error;
      return (data || []) as GroupRoleEntry[];
    },
    enabled: !!conversationId,
  });

  const getUserRole = (userId: string): GroupRole => {
    const entry = roles.find(r => r.user_id === userId);
    return entry?.role || 'member';
  };

  const isAdmin = (userId: string) => getUserRole(userId) === 'admin';
  const isModerator = (userId: string) => getUserRole(userId) === 'moderator';
  const canManage = (userId: string) => isAdmin(userId) || isModerator(userId);

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: GroupRole }) => {
      if (!conversationId || !user) throw new Error('Not ready');
      
      if (role === 'member') {
        // Delete role entry (default is member)
        await supabase
          .from('group_roles')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('group_roles')
          .upsert({
            conversation_id: conversationId,
            user_id: userId,
            role,
            assigned_by: user.id,
          }, { onConflict: 'conversation_id,user_id' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-roles', conversationId] });
      toast.success('Peran berhasil diubah');
    },
    onError: (e: any) => toast.error(`Gagal: ${e.message}`),
  });

  const updateChatMode = useMutation({
    mutationFn: async (mode: 'open' | 'restricted') => {
      if (!conversationId) throw new Error('No conversation');
      const { error } = await supabase
        .from('conversations')
        .update({ chat_mode: mode } as any)
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Mode chat diubah');
    },
    onError: (e: any) => toast.error(`Gagal: ${e.message}`),
  });

  return {
    roles,
    isLoading,
    getUserRole,
    isAdmin,
    isModerator,
    canManage,
    setRole,
    updateChatMode,
  };
}
