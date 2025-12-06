// src/hooks/useBookmarks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBookmarks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Ambil daftar bookmark pengguna
  const { data: bookmarks, isLoading, error } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mutasi untuk membuat bookmark baru
  const createBookmark = useMutation({
    mutationFn: async ({ postId, folderId }: { postId: string; folderId?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if bookmark already exists
      const { data: existing } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle();
      
      if (existing) {
        // Already bookmarked, just return
        return existing;
      }
      
      // If no folder specified, get or create default folder
      let targetFolderId = folderId;
      if (!targetFolderId) {
        const { data: existingFolder } = await supabase
          .from('bookmark_folders')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', 'Default')
          .maybeSingle();
        
        if (existingFolder) {
          targetFolderId = existingFolder.id;
        } else {
          const { data: newFolder, error: folderError } = await supabase
            .from('bookmark_folders')
            .insert([{ user_id: user.id, name: 'Default' }])
            .select('id')
            .single();
          
          if (folderError) throw folderError;
          targetFolderId = newFolder?.id;
        }
      }

      const { data, error } = await supabase
        .from('bookmarks')
        .insert([{ user_id: user.id, post_id: postId, folder_id: targetFolderId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['bookmarked-posts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Mutasi untuk menghapus bookmark
  const deleteBookmark = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) return;
      const { data, error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
       queryClient.invalidateQueries({ queryKey: ['posts'] }); // Invalidate daftar postingan untuk memperbarui status bookmark
    },
  });

  return {
    bookmarks,
    isLoading,
    error,
    createBookmark,
    deleteBookmark,
  };
};
