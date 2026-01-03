import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OptimizedStory {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption?: string;
  location?: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
}

// 24 hour cache untuk stories
const STORY_CACHE_HOURS = 24;

export function useOptimizedStories() {
  return useQuery({
    queryKey: ["optimizedStories"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(
        Date.now() - STORY_CACHE_HOURS * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabase
        .from("stories")
        .select(
          `
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
        `
        )
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((story: any) => ({
        id: story.id,
        user_id: story.user_id,
        media_url: story.media_url,
        media_type: story.media_type,
        caption: undefined,
        location: undefined,
        created_at: story.created_at,
        user: {
          id: story.profiles?.user_id,
          username: story.profiles?.username || "",
          displayName: story.profiles?.display_name || story.profiles?.username || "",
          avatar: story.profiles?.avatar_url || "",
        },
      })) as OptimizedStory[];
    },
    // Cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateOptimizedStory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      mediaType,
      caption,
      location,
    }: {
      file: File;
      mediaType: string;
      caption?: string;
      location?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Upload file to stories bucket with optimized path
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("stories")
        .getPublicUrl(fileName);

      // Create story record - note: caption and location fields may not exist yet
      // They will be added after migration
      const storyData: any = {
        user_id: user.id,
        media_url: publicUrlData.publicUrl,
        media_type: mediaType,
      };

      // Only add caption and location if they have values
      // After migration, these can be uncommented
      // if (caption) storyData.caption = caption;
      // if (location) storyData.location = location;

      const { data, error } = await supabase
        .from("stories")
        .insert(storyData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate stories cache
      queryClient.invalidateQueries({ queryKey: ["optimizedStories"] });
    },
  });
}

// Hook untuk user's own stories
export function useUserStories(userId: string) {
  return useQuery({
    queryKey: ["userStories", userId],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(
        Date.now() - STORY_CACHE_HOURS * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabase
        .from("stories")
        .select(
          `
          id,
          user_id,
          media_url,
          media_type,
          created_at
        `
        )
        .eq("user_id", userId)
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((story: any) => ({
        id: story.id,
        user_id: story.user_id,
        media_url: story.media_url,
        media_type: story.media_type,
        caption: undefined,
        location: undefined,
        created_at: story.created_at,
        user: {
          id: story.user_id,
          username: "",
          displayName: "",
          avatar: "",
        },
      })) as OptimizedStory[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // Cache untuk 2 menit
  });
}
