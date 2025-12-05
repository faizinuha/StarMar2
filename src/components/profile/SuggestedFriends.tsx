import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFollowStatus, useToggleFollow } from '../../hooks/useFollow';
import { SuggestedFriendsSkeleton } from '../skeletons/SuggestedFriendsSkeleton';
import { supabase } from '../../integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

const SuggestedFriendItem = ({ profile }: { profile: Profile }) => {
  const { data: isFollowing } = useFollowStatus(profile.user_id);
  const toggleFollow = useToggleFollow();

  return (
    <div className="flex items-center justify-between">
      <Link to={`/profile/${profile.username}`} className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback>{profile.display_name?.[0] || profile.username?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm text-foreground">{profile.display_name || profile.username}</p>
          <p className="text-xs text-muted-foreground">Suggested for you</p>
        </div>
      </Link>
      <Button
        size="sm"
        variant={isFollowing ? "outline" : "default"}
        onClick={(e) => {
          e.preventDefault();
          toggleFollow.mutate({ userId: profile.user_id, isFollowing: !!isFollowing });
        }}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </Button>
    </div>
  );
};

const SuggestedFriends = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch profiles the user is already following
      const { data: followingProfiles, error: followingError } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followingError) {
        console.error('Error fetching following list:', followingError);
        setLoading(false);
        return;
      }

      const followingIds = followingProfiles?.map(f => f.following_id) || [];
      const excludedIds = [...followingIds, user.id];

      // Fetch random profiles, excluding the user and those they follow
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url')
        .not('user_id', 'in', `(${excludedIds.join(',')})`)
        .limit(5);

      if (profilesError) {
        console.error('Error fetching suggestions:', profilesError);
      } else if (profiles) {
        // Simple client-side shuffle for better randomness
        setSuggestions(profiles.sort(() => 0.5 - Math.random()) as Profile[]);
      }
      setLoading(false);
    };

    fetchSuggestions();
  }, [user]);

  if (loading) {
    return <SuggestedFriendsSkeleton />;
  }

  if (!suggestions.length) {
    return null;
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 mt-6">
      <h3 className="font-bold text-lg mb-4 text-foreground">Suggested for you</h3>
      <div className="space-y-4">
        {suggestions.map((profile) => (
          <SuggestedFriendItem key={profile.id} profile={profile} />
        ))}
      </div>
    </div>
  );
};

export default SuggestedFriends;
