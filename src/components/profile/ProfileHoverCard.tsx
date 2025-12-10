import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { ReactNode } from 'react';

interface ProfileHoverCardProps {
  children: ReactNode;
  user: {
    user_id: string;
    username: string | null;
    display_name?: string | null;
    avatar_url: string | null;
    bio?: string | null;
    followers_count?: number;
    following_count?: number;
    is_verified?: string | null;
    created_at?: string;
  };
}

export const ProfileHoverCard = ({ children, user }: ProfileHoverCardProps) => {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="start">
        <div className="flex justify-between space-x-4">
          <Link to={`/profile/${user.user_id}`}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>
                {user.display_name?.charAt(0) || user.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Link to={`/profile/${user.user_id}`} className="text-sm font-semibold hover:underline">
                {user.display_name || user.username}
              </Link>
              {user.is_verified === 'verified' && (
                <Badge className="starmar-gradient text-white border-0 h-5 text-xs">✓</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {user.bio && (
              <p className="text-sm line-clamp-2">{user.bio}</p>
            )}
            <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{user.followers_count?.toLocaleString() || 0} followers</span>
              </div>
              <span>·</span>
              <span>{user.following_count?.toLocaleString() || 0} following</span>
            </div>
            {user.created_at && (
              <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                <span>Joined {format(new Date(user.created_at), 'MMM yyyy')}</span>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};