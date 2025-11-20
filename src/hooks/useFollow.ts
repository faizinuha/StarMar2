import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useFollowStatus(userId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["follow-status", user?.id, userId],
    queryFn: async () => {
      if (!user || !userId || user.id === userId) return false;
      
      try {
        const { data, error } = await supabase
          .from("followers")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", userId)
          .limit(1);

        if (error) {
          console.warn('Error checking follow status:', error);
          return false;
        }
        
        return data && data.length > 0;
      } catch (err: any) {
        console.error('Failed to check follow status:', err);
        return false;
      }
    },
    enabled: !!user && !!userId && user.id !== userId,
  });
}

export function useToggleFollow() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, isFollowing }: { userId: string; isFollowing: boolean }) => {
      if (!user) throw new Error("User not authenticated");

      try {
        if (isFollowing) {
          // Unfollow
          const { error } = await supabase
            .from("followers")
            .delete()
            .eq("follower_id", user.id)
            .eq("following_id", userId);

          if (error) throw error;

          // Decrement following count for current user
          await supabase.rpc("decrement_following_count", { user_id: user.id });
          
          // Decrement followers count for target user
          await supabase.rpc("decrement_followers_count", { user_id: userId });

        } else {
          // Follow
          const { error } = await supabase
            .from("followers")
            .insert({
              follower_id: user.id,
              following_id: userId,
            });

          if (error) throw error;

          // Increment following count for current user
          await supabase.rpc("increment_following_count", { user_id: user.id });
          
          // Increment followers count for target user
          await supabase.rpc("increment_followers_count", { user_id: userId });

          // Create notification
          await supabase.from("notifications").insert({
            user_id: userId,
            from_user_id: user.id,
            type: "follow",
          });
        }

        return !isFollowing;
      } catch (error: any) {
        console.error('Toggle follow error:', error);
        throw error;
      }
    },
    onSuccess: (newFollowStatus, variables) => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", user?.id, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["profile", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      
      toast({
        title: newFollowStatus ? "Following!" : "Unfollowed",
        description: newFollowStatus ? "You are now following this user" : "You have unfollowed this user",
      });
    },
    onError: (error: any) => {
      console.error('Failed to toggle follow:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    },
  });
}