import { useUserPosts } from '@/hooks/usePosts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Grid3X3, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MoreFromUserProps {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  currentPostId?: string;
}

export const MoreFromUser = ({
  userId,
  username,
  displayName,
  avatar,
  currentPostId,
}: MoreFromUserProps) => {
  const { data: posts = [] } = useUserPosts(userId);

  // Filter out current post and limit to 6 posts
  const filteredPosts = posts
    .filter((post) => post.id !== currentPostId)
    .slice(0, 6);

  if (filteredPosts.length === 0) return null;

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar} alt={displayName} />
          <AvatarFallback>{displayName?.[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm">More from {displayName}</p>
          <Link
            to={`/profile/${username}`}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            @{username}
          </Link>
        </div>
      </div>

      {/* Instagram-style grid */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {filteredPosts.map((post) => {
          const firstMedia = post.media?.[0];
          const isVideo = firstMedia?.media_type === 'video';

          return (
            <Link
              key={post.id}
              to={`/post/${post.id}`}
              className="relative aspect-square group overflow-hidden rounded-sm"
            >
              {firstMedia ? (
                <>
                  {isVideo ? (
                    <video
                      src={firstMedia.media_url}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <img
                      src={firstMedia.media_url}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                  {isVideo && (
                    <div className="absolute top-2 right-2">
                      <Play className="h-4 w-4 text-white drop-shadow-lg" />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Grid3X3 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};
