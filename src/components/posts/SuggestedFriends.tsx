import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { X, UserPlus, UserMinus } from "lucide-react";
import { useFollowStatus, useToggleFollow } from "@/hooks/useFollow";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/useProfile";
import { useAllProfiles } from "@/hooks/useAllProfiles";
import { ProfileHoverCard } from "@/components/profile/ProfileHoverCard";
import { Link } from "react-router-dom";

interface SuggestedUser {
  avatar_url: string | null;
  id: string;
  username: string | null;
  displayName: string | null;
  mutualFollows?: number;
  bio?: string | null;
  followers_count?: number;
  following_count?: number;
}

export const SuggestedFriends = () => {
  const { user } = useAuth();
  const { data: currentUserProfile } = useProfile();
  const { data: allProfiles, isLoading } = useAllProfiles();
  const [dismissedUsers, setDismissedUsers] = useState<string[]>([]);

  if (!user || !currentUserProfile || isLoading) return null;

  const visibleUsers = (allProfiles || [])
    .filter((u: any) => u.user_id !== user.id && !dismissedUsers.includes(u.user_id))
    .slice(0, 5)
    .map((u: any) => ({
      id: u.user_id,
      username: u.username,
      displayName: u.display_name || u.username,
      avatar_url: u.avatar_url,
      bio: u.bio,
      followers_count: u.followers_count,
      following_count: u.following_count,
    }));

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Current User Section */}
          <h2 className="text-lg font-semibold">Current user</h2>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={currentUserProfile.avatar_url || undefined} />
              <AvatarFallback>{currentUserProfile.display_name?.charAt(0) || currentUserProfile.username?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-base">{currentUserProfile.display_name || currentUserProfile.username}</h3>
              <p className="text-sm text-muted-foreground">@{currentUserProfile.username}</p>
            </div>
          </div>

          <Separator />

          {/* Suggested Users Section */}
          <h2 className="text-lg font-semibold">Suggested for you</h2>
          <div className="flex flex-col gap-2">
            {visibleUsers.map((suggestedUser) => (
              <SuggestedUserCard
                key={suggestedUser.id}
                user={suggestedUser}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface SuggestedUserCardProps {
  user: SuggestedUser;
}

const SuggestedUserCard = ({ user: suggestedUser }: SuggestedUserCardProps) => {
  const { data: followStatus } = useFollowStatus(suggestedUser.id);
  const toggleFollowMutation = useToggleFollow();
  const { toast } = useToast();

  const handleFollow = async () => {
    try {
      await toggleFollowMutation.mutateAsync({
        userId: suggestedUser.id,
        isFollowing: followStatus || false
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive"
      });
    }
  };

  const hoverUser = {
    user_id: suggestedUser.id,
    username: suggestedUser.username,
    display_name: suggestedUser.displayName,
    avatar_url: suggestedUser.avatar_url,
    bio: suggestedUser.bio,
    followers_count: suggestedUser.followers_count,
    following_count: suggestedUser.following_count,
  };

  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50">
      <ProfileHoverCard user={hoverUser}>
        <div className="flex items-center gap-3 cursor-pointer">
          <Link to={`/profile/${suggestedUser.id}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={suggestedUser.avatar_url || undefined} />
              <AvatarFallback>{suggestedUser.displayName?.charAt(0) || suggestedUser.username?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link to={`/profile/${suggestedUser.id}`} className="hover:underline">
              <h3 className="font-semibold text-sm">{suggestedUser.displayName || suggestedUser.username}</h3>
            </Link>
            <p className="text-sm text-muted-foreground">@{suggestedUser.username || 'user'}</p>
          </div>
        </div>
      </ProfileHoverCard>
      <Button
        size="sm"
        className="h-7 px-3"
        onClick={handleFollow}
        disabled={toggleFollowMutation.isPending}
      >
        {followStatus ? 'Unfollow' : 'Follow'}
      </Button>
    </div>
  );
};
