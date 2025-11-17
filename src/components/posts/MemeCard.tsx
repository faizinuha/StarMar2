import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLikes } from '@/hooks/useLikes';
import { useMemeComments } from '@/hooks/useComments';
import { Meme, useAddMemeBadge, useBadges } from '@/hooks/useMemes';
import {
  Bookmark,
  Heart,
  Laugh,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  PlusCircle,
  Share,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CommentSection } from './CommentSection';

interface MemeCardProps {
  meme: Meme;
}

// A new component to handle adding badges
const AddBadgePopover = ({ meme }: { meme: Meme }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: allBadges, isLoading: isLoadingBadges } = useBadges();
  const addMemeBadge = useAddMemeBadge();

  const handleAddBadge = (badgeId: number) => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to add a badge.',
        variant: 'destructive',
      });
      return;
    }
    addMemeBadge.mutate({ memeId: meme.id, badgeId });
  };

  const existingBadgeIds = new Set(meme.badges.map((b) => b.id));
  const availableBadges = allBadges?.filter((b) => !existingBadgeIds.has(b.id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <PlusCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="space-y-1">
          <p className="font-semibold text-sm px-2">Add a badge</p>
          {isLoadingBadges ? (
            <div className="flex items-center justify-center p-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : availableBadges && availableBadges.length > 0 ? (
            availableBadges.map((badge) => (
              <Button
                key={badge.id}
                variant="ghost"
                className="w-full justify-start h-8 px-2"
                onClick={() => handleAddBadge(badge.id)}
                disabled={addMemeBadge.isPending}
              >
                {badge.name}
              </Button>
            ))
          ) : (
            <p className="text-xs text-muted-foreground px-2">
              No more badges to add.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const MemeCard = ({ meme }: MemeCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { likesCount, isLiked, toggleLike } = useLikes('meme', meme.id, meme.user_id);
  const { data: commentsForMeme = [] } = useMemeComments(meme.id);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'You need to be logged in to like memes.',
        variant: 'destructive',
      });
      return;
    }
    toggleLike();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Meme by @${meme.user.username}`,
        text: meme.caption,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied to clipboard!',
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d`;
    }
  };

  const isLongCaption = meme.caption && meme.caption.length > 150;
  const displayContent =
    showFullCaption || !isLongCaption
      ? meme.caption
      : meme.caption?.substring(0, 150) + '...';

  return (
    <Card className="post-card bg-card animate-fade-in border-2 border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link
          to={`/profile/${meme.user.username}`}
          className="flex items-center space-x-3"
        >
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={meme.user.avatar} alt={meme.user.displayName} />
            <AvatarFallback>
              {meme.user.displayName?.charAt(0) ||
                meme.user.username?.charAt(0) ||
                'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">
                {meme.user.displayName || meme.user.username}
              </p>
              <Laugh className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <span>@{meme.user.username}</span>
              <span>•</span>
              <span>{formatTimeAgo(meme.created_at)}</span>
            </div>
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Follow @{meme.user.username}</DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare}>
              Share meme
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media */}
      <div className="aspect-square overflow-hidden bg-black">
        {meme.media_type === 'image' ? (
          <img
            src={meme.media_url}
            alt="Meme content"
            className="w-full h-full object-contain hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <video
            src={meme.media_url}
            controls
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Actions & Badges */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={handleLike}
            >
              <Heart
                className={`h-6 w-6 transition-all duration-200 ${
                  isLiked
                    ? 'fill-red-500 text-red-500 animate-heart-beat'
                    : 'hover:text-red-500'
                }`}
              />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10"
              onClick={() => setShowComments(true)}
            >
              <MessageCircle className="h-6 w-6 hover:text-blue-500 transition-colors" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={handleShare}
            >
              <Share className="h-6 w-6 hover:text-green-500 transition-colors" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => setIsBookmarked(!isBookmarked)}
          >
            <Bookmark
              className={`h-6 w-6 transition-colors ${
                isBookmarked
                  ? 'fill-yellow-500 text-yellow-500'
                  : 'hover:text-yellow-500'
              }`}
            />
          </Button>
        </div>

        {/* Likes Count */}
        <div className="flex items-center gap-4">
          <div className="text-sm font-semibold">
            {likesCount.toLocaleString()} likes
          </div>
          {commentsForMeme.length > 0 && (
            <button
              onClick={() => setShowComments(true)}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {commentsForMeme.length} {commentsForMeme.length === 1 ? 'comment' : 'comments'}
            </button>
          )}
        </div>

        {/* Badges Section */}
        {meme.badges && meme.badges.length > 0 && (
          <div className="flex items-center flex-wrap gap-2">
            {meme.badges.map((badge) => (
              <Badge key={badge.id} variant="secondary">
                {badge.name}
              </Badge>
            ))}
            <AddBadgePopover meme={meme} />
          </div>
        )}

        {/* Caption */}
        {meme.caption && (
          <div className="text-sm space-y-1">
            <span className="font-semibold">@{meme.user.username}</span>{' '}
            <span className="whitespace-pre-wrap">{displayContent}</span>
            {isLongCaption && !showFullCaption && (
              <button
                className="text-muted-foreground hover:text-foreground ml-1"
                onClick={() => setShowFullCaption(true)}
              >
                more
              </button>
            )}
          </div>
        )}

        {/* Add Badge Button (if no badges exist yet) */}
        {(!meme.badges || meme.badges.length === 0) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Add a badge:</span>
            <AddBadgePopover meme={meme} />
          </div>
        )}

        {/* Comments Link */}
        {commentsForMeme.length > 0 && (
          <button 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowComments(true)}
          >
            View all {commentsForMeme.length} comments
          </button>
        )}
      </div>

      {/* Comment Section Modal */}
      {showComments && (
        <CommentSection
          memeId={meme.id}
          post={{
            id: meme.id,
            user_id: meme.user_id,
            content: meme.caption || '',
            image_url: meme.media_url,
            created_at: meme.created_at,
            likes: likesCount,
            comments: commentsForMeme.length,
            isLiked: isLiked,
            isBookmarked: isBookmarked,
            user: {
              username: meme.user.username,
              displayName: meme.user.displayName,
              avatar: meme.user.avatar,
            },
            media_type: meme.media_type,
          }}
          onClose={() => setShowComments(false)}
          isOpen={showComments}
        />
      )}
    </Card>
  );
};
