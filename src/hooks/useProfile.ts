import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name?: string;
  bio?: string;
  avatar_url: string | null;
  cover_img?: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_private: boolean;
  is_verified: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  likes_count: ReactNode;
  profiles: any;
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  media_type?: string;
  created_at: string;
  likes: number;
  comments: number;
  isLiked: boolean; // This will be derived from user_likes
  isBookmarked: boolean;
  location?: string;
  user: {
    username: string;
    displayName: string;
    avatar: string;
  };
}

export function useProfile(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["profile", targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error("No user ID provided");
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", targetUserId)
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        const processUrl = async (url: string | undefined | null): Promise<string | undefined | null> => {
            if (!url) return null;

            // If it's an external URL (e.g., Google), not a Supabase storage URL, leave it as is.
            if (url.startsWith('http') && !url.includes('ogbzhbwfucgjiafhsxab.supabase.co')) {
                return url;
            }

            // It's either a path or a Supabase URL. Let's get the path.
            let path = url;
            if (url.startsWith('http')) {
                try {
                    const urlObject = new URL(url);
                    const pathParts = urlObject.pathname.split('/avatars/');
                    if (pathParts.length > 1) {
                        path = pathParts[1];
                    } else {
                        return url; // Cannot extract path
                    }
                } catch (e) {
                    return url; // Not a valid URL
                }
            }

            const { data: signedUrlData } = await supabase.storage
                .from('avatars')
                .createSignedUrl(path, 99999999); // 1 year
            
            return signedUrlData ? signedUrlData.signedUrl : url;
        };

        data.avatar_url = await processUrl(data.avatar_url) || data.avatar_url;
        data.cover_img = await processUrl(data.cover_img) || data.cover_img;
      }

      return data as Profile;
    },
    enabled: !!targetUserId,
  });
}

export function useProfileByUsername(username?: string) {
  return useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      if (!username) throw new Error("No username provided");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        const processUrl = async (url: string | undefined | null): Promise<string | undefined | null> => {
            if (!url) return null;

            // If it's an external URL (e.g., Google), not a Supabase storage URL, leave it as is.
            if (url.startsWith('http') && !url.includes('ogbzhbwfucgjiafhsxab.supabase.co')) {
                return url;
            }

            // It's either a path or a Supabase URL. Let's get the path.
            let path = url;
            if (url.startsWith('http')) {
                try {
                    const urlObject = new URL(url);
                    const pathParts = urlObject.pathname.split('/avatars/');
                    if (pathParts.length > 1) {
                        path = pathParts[1];
                    } else {
                        return url; // Cannot extract path
                    }
                } catch (e) {
                    return url; // Not a valid URL
                }
            }

            const { data: signedUrlData } = await supabase.storage
                .from('avatars')
                .createSignedUrl(path, 99999999); // 1 year
            
            return signedUrlData ? signedUrlData.signedUrl : url;
        };

        data.avatar_url = await processUrl(data.avatar_url) || data.avatar_url;
        data.cover_img = await processUrl(data.cover_img) || data.cover_img;
      }

      return data as Profile;
    },
    enabled: !!username,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile> & { is_verified?: boolean }) => {
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}


export function useAllPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["allPosts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          user_id,
          caption,
          location,
          created_at,
          likes_count,
          comments_count,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url
          ),
          post_media (
            media_url,
            media_type
          ),
          user_likes: likes(user_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processUrl = async (url: string | undefined | null): Promise<string | undefined | null> => {
        if (!url) return null;
        if (url.startsWith('http') && !url.includes('ogbzhbwfucgjiafhsxab.supabase.co')) {
            return url;
        }
        let path = url;
        if (url.startsWith('http')) {
            try {
                const urlObject = new URL(url);
                const pathParts = urlObject.pathname.split('/avatars/');
                if (pathParts.length > 1) {
                    path = pathParts[1];
                } else {
                    return url;
                }
            } catch (e) {
                return url;
            }
        }
        const { data: signedUrlData } = await supabase.storage
            .from('avatars')
            .createSignedUrl(path, 99999999);
        return signedUrlData ? signedUrlData.signedUrl : url;
      };

      const processedData = await Promise.all(data.map(async (post: any) => {
        const avatarUrl = await processUrl(post.profiles?.avatar_url);
        return {
          id: post.id,
          content: post.caption || '',
          location: post.location,
          created_at: post.created_at,
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          isLiked: post.user_likes.some((like: { user_id: string }) => like.user_id === user?.id),
          isBookmarked: false, // TODO: Implement bookmark logic
          image_url: post.post_media?.[0]?.media_url,
          media_type: post.post_media?.[0]?.media_type,
          user: {
            username: post.profiles?.username || '',
            displayName: post.profiles?.display_name || post.profiles?.username || '',
            avatar: avatarUrl || '',
          },
          user_id: post.user_id,
        }
      }));

      return processedData as Post[];
    },
  });
}

export function useTogglePostLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error("User not authenticated");

      if (isLiked) {
        // Unlike post
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);

        if (error) throw error;

        // Decrement likes_count in posts table
        await supabase.rpc("decrement_likes_count", { post_id: postId });

      } else {
        // Like post
        const { error } = await supabase
          .from("likes")
          .insert({
            user_id: user.id,
            post_id: postId,
          });

        if (error) throw error;

        // Increment likes_count in posts table
        await supabase.rpc("increment_likes_count", { post_id: postId });
      }

      return true;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refetch posts with updated like status and count
      queryClient.invalidateQueries({ queryKey: ["allPosts"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] }); // Invalidate single post query if exists
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPosts"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      // 1. Update the post content
      const { data: post, error: postError } = await supabase
        .from("posts")
        .update({ caption: content })
        .eq("id", postId)
        .select()
        .single();

      if (postError) {
        console.error("Error updating post:", postError);
        throw postError;
      }

      // --- START HASHTAG SYNCING ---
      // Use the existing extract_and_store_hashtags function
      try {
        await supabase.rpc('extract_and_store_hashtags', { 
          post_content: content, 
          post_id: postId 
        });
      } catch(e) { 
        console.error('Error syncing hashtags:', e) 
      }
      // --- END HASHTAG SYNCING ---

      return post;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["allPosts"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}
