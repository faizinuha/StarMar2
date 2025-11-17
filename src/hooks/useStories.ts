import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
}

export function useStories() {
  return useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select(`
          id,
          user_id,
          media_url,
          media_type,
          created_at,
          profiles!stories_user_id_fkey (
            user_id,
            username,
            display_name,
            avatar_url
          )
        `)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Only stories from last 24 hours
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((story: any) => ({
        id: story.id,
        user_id: story.user_id,
        media_url: story.media_url,
        media_type: story.media_type,
        created_at: story.created_at,
        user: {
          id: story.profiles?.user_id,
          username: story.profiles?.username || '',
          displayName: story.profiles?.display_name || story.profiles?.username || '',
          avatar: story.profiles?.avatar_url || '',
        },
      })) as Story[];
    },
  });
}

export function useCreateStory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, mediaType }: { file: File; mediaType: string }) => {
      if (!user) throw new Error("User not authenticated");

      // Upload file to stories bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      // Create story record
      const { data, error } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: mediaType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
  });
}

export function useDeleteStory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", storyId)
        .eq("user_id", user.id); // Can only delete own stories

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
  });
}