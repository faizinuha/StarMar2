import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Badge {
  id: number;
  name: string;
}

export interface Meme {
  id: string;
  user_id: string;
  caption: string;
  media_url: string;
  media_type: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  isLiked: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  badges: Badge[];
}

// Replaced useAllMemes with a function that fetches memes with their badges
// This relies on the get_memes_with_badges() database function created in the migration.
export function useAllMemesWithBadges() {
  return useQuery({
    queryKey: ["allMemes"],
    queryFn: async () => {
      // IMPORTANT: This requires the `get_memes_with_badges` function from the migration.
      const { data, error } = await supabase.rpc('get_memes_with_badges');

      if (error) {
        console.error("Error fetching memes with badges:", error);
        // Fallback to fetching without badges if the RPC fails
        return useAllMemes_fallback();
      }
      
      // The RPC function returns a well-structured object, so less mapping is needed.
      return data.map((meme: any) => ({
        ...meme,
        isLiked: false, // isLiked is a client-side state, managed by useLikes hook
      })) as Meme[];
    },
  });
}

// Fallback function in case the RPC `get_memes_with_badges` is not available
async function useAllMemes_fallback() {
    const { data, error } = await supabase
        .from("memes")
        .select(`
          id, 
          caption,
          media_url,
          media_type,
          created_at, 
          likes_count, 
          comments_count,
          profiles!memes_user_id_fkey (
            user_id, 
            username, 
            display_name, 
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((meme: any) => ({
        id: meme.id,
        user_id: meme.profiles?.user_id,
        caption: meme.caption || '',
        media_url: meme.media_url,
        media_type: meme.media_type,
        created_at: meme.created_at,
        likes_count: meme.likes_count || 0,
        comments_count: meme.comments_count || 0,
        isLiked: false,
        user: {
          id: meme.profiles?.user_id,
          username: meme.profiles?.username || '',
          displayName: meme.profiles?.display_name || meme.profiles?.username || '',
          avatar: meme.profiles?.avatar_url || '',
        },
        badges: [], // Return empty badges array
      })) as Meme[];
}


export function useUserMemes(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["userMemes", targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error("No user ID provided");

      const { data, error } = await supabase
        .from("memes")
        .select(`
          id, 
          caption,
          media_url,
          media_type,
          created_at, 
          likes_count, 
          comments_count,
          profiles!memes_user_id_fkey (
            user_id, 
            username, 
            display_name, 
            avatar_url
          )
        `)
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((meme: any) => ({
        id: meme.id,
        user_id: meme.profiles?.user_id,
        caption: meme.caption || '',
        media_url: meme.media_url,
        media_type: meme.media_type,
        created_at: meme.created_at,
        likes_count: meme.likes_count || 0,
        comments_count: meme.comments_count || 0,
        isLiked: false,
        user: {
          id: meme.profiles?.user_id,
          username: meme.profiles?.username || '',
          displayName: meme.profiles?.display_name || meme.profiles?.username || '',
          avatar: meme.profiles?.avatar_url || '',
        },
        badges: [], // Badges are not fetched for user-specific memes yet
      })) as Meme[];
    },
    enabled: !!targetUserId,
  });
}

// New hook to fetch all available badges
export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data, error } = await supabase.from('badges').select('*');
      if (error) throw error;
      return data as Badge[];
    }
  });
}

// New mutation to add a badge to a meme
export function useAddMemeBadge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memeId, badgeId }: { memeId: string; badgeId: number }) => {
      const { error } = await supabase.from('meme_badges').insert({ meme_id: memeId, badge_id: badgeId });
      if (error) throw error;
      return { memeId, badgeId };
    },
    onSuccess: () => {
      // Invalidate and refetch all memes to get the updated badge list
      queryClient.invalidateQueries({ queryKey: ['allMemes'] });
    },
  });
}
