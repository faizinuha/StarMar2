import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { usePostComments as useComments } from '@/hooks/useComments';
import { useLikes } from '@/hooks/useLikes';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useDeletePost } from '@/hooks/useProfile';
import {
  Bookmark,
  Heart,
  Laugh,
  MessageCircle,
  MoreHorizontal,
  Play,
  Repeat,
  Share,
  Flag,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { UnifiedCommentModal } from './UnifiedCommentModal';
import { EditPostModal } from './EditPostModal';
import { PostCaption } from './PostCaption';
import { BookmarkFolderDialog } from './BookmarkFolderDialog';
import { ReportDialog } from './ReportDialog';

interface PostMedia {
  media_url: string;
  media_type: string;
  order_index?: number;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  likes: number;
  likes_count: number;
  comments: number;
  comments_count: number;
  isLiked: boolean;
  isBookmarked: boolean;
  location?: string;
  user: {
    username: string;
    displayName: string;
    avatar: string;
  };
  media_type?: string;
  media?: PostMedia[];
  repost_by?: {
    username: string;
    displayName: string;
  };
}

interface PostCardProps {
  post: Post;
}

const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
  return `${Math.floor(diffInMinutes / 1440)}d`;
};

interface RepostCardProps {
  repost_by: { username?: string; displayName?: string } | undefined;
  children: React.ReactNode;
}

const RepostCard = ({ repost_by, children }: RepostCardProps) => (
  <div className="bg-muted/20 rounded-lg p-4 mt-2">
    <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
      <Repeat className="h-4 w-4" />
      <span>Reposted by {repost_by.displayName}</span>
    </div>
    {children}
  </div>
);

export const PostCard = ({ post }: PostCardProps) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const deletePostMutation = useDeletePost();

  const { data: commentsForPost = [] } =
    useComments(post.id);

  const latestComment = commentsForPost.length
    ? commentsForPost[commentsForPost.length - 1]
    : null;
  const commentPreviewId = latestComment?.id as string | undefined;
  useLikes('comment', commentPreviewId);

  const {
    likesCount: likesCountPost = 0,
    isLiked: isLikedPost = false,
    toggleLike: togglePostLike,
    loading: likesLoading,
  } = useLikes('post', post.id, post.user_id);

  const {
    bookmarks,
    isLoading: bookmarksLoading,
    createBookmark,
    deleteBookmark,
  } = useBookmarks();
  const isBookmarked = bookmarks?.some((bookmark) => bookmark.post_id === post.id) || false;

  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          videoRef.current?.pause();
          setIsVideoPlaying(false);
        }
      }, { threshold: 0.5 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  const handleLike = () => {
    if (!currentUser) {
      toast({
        title: 'Login required',
        description: 'You need to be logged in to like posts.',
        variant: 'destructive',
      });
      return;
    }
    togglePostLike();
  };

  const handleBookmark = async () => {
    if (!currentUser) {
      toast({
        title: 'Login required',
        description: 'You need to be logged in to bookmark posts.',
        variant: 'destructive',
      });
      return;
    }

    if (isBookmarked) {
      await deleteBookmark.mutateAsync(post.id);
      toast({ title: 'Bookmark removed' });
    } else {
      // Open folder selection dialog
      setShowBookmarkDialog(true);
    }
  };

  const handleDelete = async () => {
    await deletePostMutation.mutateAsync(post.id);
    toast({ title: 'Post deleted successfully' });
  };

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    toast({ title: 'Link copied to clipboard' });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Post by @${post.user.username}`,
        text: post.content,
        url: `${window.location.origin}/post/${post.id}`,
      });
    } else {
      navigator.clipboard.writeText(
        `${window.location.origin}/post/${post.id}`
      );
      toast({ title: 'Link copied to clipboard!' });
    }
  };

  const initialContent = post?.content ?? '';
  const isLongCaption = initialContent.length > 150;
  const displayContent =
    showFullCaption || !isLongCaption
      ? initialContent
      : `${initialContent.substring(0, 150)}...`;

  if (!post || !post.user) return null;

  const isOwnPost = currentUser?.id === post.user_id;

  const PostContent = () => (
    <Card className="post-card bg-card border-b-2">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={post.user.avatar} alt={post.user.displayName} />
            <AvatarFallback>{post.user.displayName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{post.user.displayName}</p>
              <Laugh className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <span>@{post.user.username}</span>
              <span>•</span>
              <span>{formatTimeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwnPost ? (
              <>
                <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                  Edit Post
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  Delete Post
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem>Follow @{post.user.username}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="text-destructive">
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content: Media or Text */}
      {post.image_url || (post.media && post.media.length > 0) ? (
        <div className="aspect-square overflow-hidden bg-black flex items-center justify-center relative group">
          {post.media && post.media.length > 0 ? (
            <>
              {post.media[currentMediaIndex]?.media_type === 'video' ? (
                <>
                  <video
                    ref={videoRef}
                    src={post.media[currentMediaIndex]?.media_url}
                    loop
                    playsInline
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => {
                      if (videoRef.current?.paused) {
                        videoRef.current?.play();
                        setIsVideoPlaying(true);
                      } else {
                        videoRef.current?.pause();
                        setIsVideoPlaying(false);
                      }
                    }}
                  />
                  {!isVideoPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                      <div className="bg-black/50 rounded-full p-3">
                        <Play className="h-10 w-10 text-white fill-white" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={post.media[currentMediaIndex]?.media_url}
                  alt={post.content || 'Post content'}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              )}
              
              {post.media.length > 1 && (
                <>
                  {currentMediaIndex > 0 && (
                    <button
                      onClick={() => setCurrentMediaIndex(prev => prev - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100"
                    >
                      ‹
                    </button>
                  )}
                  {currentMediaIndex < post.media.length - 1 && (
                    <button
                      onClick={() => setCurrentMediaIndex(prev => prev + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100"
                    >
                      ›
                    </button>
                  )}
                  
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {post.media.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1.5 w-1.5 rounded-full transition-all ${
                          index === currentMediaIndex ? 'bg-white w-3' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : post.media_type === 'video' ? (
            <>
              <video
                ref={videoRef}
                src={post.image_url}
                loop
                playsInline
                className="w-full h-full object-contain cursor-pointer"
                onClick={() => {
                  if (videoRef.current?.paused) {
                    videoRef.current?.play();
                    setIsVideoPlaying(true);
                  } else {
                    videoRef.current?.pause();
                    setIsVideoPlaying(false);
                  }
                }}
              />
              {!isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                  <div className="bg-black/50 rounded-full p-3">
                    <Play className="h-10 w-10 text-white fill-white" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <img
              src={post.image_url}
              alt={post.content || 'Post content'}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          )}
        </div>
      ) : (
        <div className="px-4 pb-2 min-h-[150px] flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
          <PostCaption content={post.content} />
        </div>
      )}

      {/* Actions & Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              disabled={likesLoading}
              className={`flex items-center gap-2 text-sm transition-colors ${
                isLikedPost
                  ? 'text-red-500'
                  : 'text-muted-foreground hover:text-red-500'
              }`}
            >
              <Heart
                className={`h-6 w-6 ${isLikedPost ? 'fill-red-500' : ''}`}
              />
              <span className="font-semibold">
                {likesCountPost.toLocaleString()}
              </span>
            </button>

            <button
              onClick={() => setShowComments(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-500 transition-colors"
            >
              <MessageCircle className="h-6 w-6" />
              <span className="font-semibold">
                {commentsForPost.length.toLocaleString()}
              </span>
            </button>

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
            onClick={handleBookmark}
            disabled={bookmarksLoading}
          >
            <Bookmark
              className={`h-6 w-6 transition-colors ${
                isBookmarked
                  ? 'fill-orange-500 text-orange-500'
                  : 'hover:text-orange-500'
              }`}
            />
          </Button>
        </div>

        {/* Caption (only for posts with media) */}
        {post.image_url && post.content && (
          <div className="text-sm space-y-1">
            <span className="font-semibold">@{post.user.username}</span>{' '}
            <PostCaption content={displayContent} />
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

        {/* View Comments Link */}
        {commentsForPost.length > 0 && (
          <button
            className="text-sm text-muted-foreground hover:text-foreground mt-2"
            onClick={() => setShowComments(true)}
          >
            View all {commentsForPost.length} comments
          </button>
        )}
      </div>
      {showComments && (
        <UnifiedCommentModal
          content={post}
          type="post"
          onClose={() => setShowComments(false)}
          isOpen={showComments}
        />
      )}
    </Card>
  );

  if (post.repost_by)
    return (
      <RepostCard repost_by={post.repost_by}>
        <PostContent />
      </RepostCard>
    );

  return (
    <>
      <PostContent />
      {isEditModalOpen && (
        <EditPostModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          post={post}
        />
      )}
      
      <BookmarkFolderDialog
        isOpen={showBookmarkDialog}
        onClose={() => setShowBookmarkDialog(false)}
        postId={post.id}
      />

      <ReportDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        postId={post.id}
        userId={post.user_id}
      />
    </>
  );
};