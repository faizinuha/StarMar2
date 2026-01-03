
import { useUserPosts } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { PostGrid } from './PostGrid';
import { Loader2, Lock } from 'lucide-react';
import { useFollowStatus } from '@/hooks/useFollow';
import { useAuth } from '@/contexts/AuthContext';

export const MorePosts = ({ userId, currentPostId }: { userId: string; currentPostId: string }) => {
  const { user: authUser } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useProfile(userId);
  const { data: posts, isLoading: arePostsLoading } = useUserPosts(userId);
  const { data: isFollowing } = useFollowStatus(userId);

  const isLoading = isProfileLoading || arePostsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const isOwnProfile = authUser?.id === userId;
  const canViewContent = !profile?.is_private || isOwnProfile || isFollowing;

  if (!canViewContent) {
    return (
      <div className="text-center py-12">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">This account is private</h3>
        <p className="text-muted-foreground">Follow this account to see their posts.</p>
      </div>
    );
  }

  // Filter out the post that is currently being viewed in the modal
  const otherPosts = posts?.filter(p => p.id !== currentPostId);

  if (!otherPosts || otherPosts.length === 0) {
    return null; // Don't show anything if there are no other posts
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4">
        More from {profile?.display_name || profile?.username}
      </h3>
      <PostGrid posts={otherPosts} onPostClick={() => { /* Decide what to do on click, maybe refresh modal? */ }} />
    </div>
  );
};
