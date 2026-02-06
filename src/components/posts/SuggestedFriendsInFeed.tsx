import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowStatus, useToggleFollow } from '@/hooks/useFollow';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

const SuggestedItem = ({ profile }: { profile: Profile }) => {
  const { data: isFollowing } = useFollowStatus(profile.user_id);
  const toggleFollow = useToggleFollow();

  return (
    <div className="flex flex-col items-center gap-2 min-w-[120px] max-w-[140px] p-3">
      <Link to={`/profile/${profile.username}`}>
        <Avatar className="h-16 w-16 ring-2 ring-primary/20">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="text-lg">{profile.display_name?.[0] || profile.username?.[0] || 'U'}</AvatarFallback>
        </Avatar>
      </Link>
      <Link to={`/profile/${profile.username}`} className="text-center min-w-0 w-full">
        <p className="font-semibold text-xs truncate text-foreground">{profile.display_name || profile.username}</p>
        <p className="text-[10px] text-muted-foreground truncate">@{profile.username}</p>
      </Link>
      <Button
        size="sm"
        variant={isFollowing ? "outline" : "default"}
        className="w-full h-7 text-xs rounded-full"
        onClick={() => {
          toggleFollow.mutate({ userId: profile.user_id, isFollowing: !!isFollowing });
        }}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </Button>
    </div>
  );
};

export const SuggestedFriendsInFeed = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: followingProfiles } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingProfiles?.map(f => f.following_id) || [];
      const excludedIds = [...followingIds, user.id];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url')
        .not('user_id', 'in', `(${excludedIds.join(',')})`)
        .limit(8);

      if (profiles) {
        setSuggestions(profiles.sort(() => 0.5 - Math.random()) as Profile[]);
      }
      setLoading(false);
    };

    fetchSuggestions();
  }, [user]);

  if (loading || !suggestions.length) return null;

  return (
    <Card className="bg-card border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <p className="font-semibold text-sm text-foreground">Mungkin Anda Kenal</p>
        <p className="text-xs text-muted-foreground ml-auto">Mengikuti salah satu teman Anda</p>
      </div>
      <div className="flex overflow-x-auto no-scrollbar py-3 px-2 gap-1">
        {suggestions.map((profile) => (
          <SuggestedItem key={profile.id} profile={profile} />
        ))}
      </div>
    </Card>
  );
};
