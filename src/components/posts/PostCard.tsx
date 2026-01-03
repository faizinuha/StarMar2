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
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useBookmarks } from '@/hooks/useBookmarks';
import { usePostComments as useComments } from '@/hooks/useComments';
import { useLikes } from '@/hooks/useLikes';
import { useDeletePost } from '@/hooks/useProfile';
import {
  Bookmark,
  Flag,
  Heart,
  Laugh,
  MessageCircle,
  MoreHorizontal,
  Play,
  Repeat,
  Share
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BookmarkFolderDialog } from './BookmarkFolderDialog';
import { EditPostModal } from './EditPostModal';
import { PostCaption } from './PostCaption';
import { ReportDialog } from './ReportDialog';
import { RepostModal } from './RepostModal';
import { UnifiedCommentModal } from './UnifiedCommentModal';

export interface PostMedia {
  media_url: string;
  media_type: string;
  order_index?: number;
}

export interface Post {
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
  is_repost?: boolean;
  original_post?: Post;
  user: {
    username: string;
    displayName: string;
    avatar: string;
    is_verified?: string | null;
  };
  media_type?: string;
  media?: PostMedia[];
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
  const [showRepostModal, setShowRepostModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Determine effective media to show (Original Post's if repost, else Post's)
  const displayMedia = post.is_repost && post.original_post ? post.original_post.media : post.media;
  const displayImageUrl = post.is_repost && post.original_post ? post.original_post.image_url : post.image_url;
  const displayMediaType = post.is_repost && post.original_post ? post.original_post.media_type : post.media_type;

  const hasMedia = displayImageUrl || (displayMedia && displayMedia.length > 0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          videoRef.current?.pause();
          setIsVideoPlaying(false);
        }
      }, { threshold: 0.5 }
    );
    if (videoRef.current) observer.observe(videoRef.current);
    return () => { if (videoRef.current) observer.unobserve(videoRef.current); };
  }, [displayMedia]); // Re-run if media changes

  const handleLike = () => {
    if (!currentUser) return toast({ title: 'Login required', description: 'You need to be logged in.', variant: 'destructive' });
    togglePostLike();
  };
  const handleBookmark = async () => {
    if (!currentUser) return toast({ title: 'Login required', description: 'You need to be logged in.', variant: 'destructive' });
    if (isBookmarked) { await deleteBookmark.mutateAsync(post.id); toast({ title: 'Bookmark removed' }); }
    else { setShowBookmarkDialog(true); }
  };
  const handleDelete = async () => { await deletePostMutation.mutateAsync(post.id); toast({ title: 'Post deleted successfully' }); };
  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    toast({ title: 'Link copied to clipboard' });
  };
  const handleRepost = () => {
    if (!currentUser) return toast({ title: 'Login required', description: 'You need to be logged in.', variant: 'destructive' });
    setShowRepostModal(true);
  };
  const handleShare = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) navigator.share({ title: `Post by @${post.user.username}`, text: post.content, url });
    else { navigator.clipboard.writeText(url); toast({ title: 'Link copied to clipboard!' }); }
  };

  const initialContent = post?.content ?? '';
  const isLongCaption = initialContent.length > 150;
  const displayContent = showFullCaption || !isLongCaption ? initialContent : `${initialContent.substring(0, 150)}...`;

  if (!post || !post.user) return null;
  const isOwnPost = currentUser?.id === post.user_id;

  return (
    <>
      <Card className="post-card bg-card border-b-2">
        {/* Header */}
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
                {post.user.is_verified === 'verified' && (
                  <span className="inline-flex items-center gap-0.2 text-xs text-blue-500 font-medium">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  </span>
                )}
                {post.is_repost && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Repeat className="h-3 w-3" /> reposted
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span>@{post.user.username}</span>
                <span>•</span>
                <span>{formatTimeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwnPost ? (
                <>
                  <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>Edit Post</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">Delete Post</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem>Follow @{post.user.username}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="text-destructive"><Flag className="h-4 w-4 mr-2" />Report</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Reposter's Caption (Content) */}
        {post.content && (
          <div className="px-4 pb-3">
            <PostCaption content={displayContent} />
            {isLongCaption && !showFullCaption && (
              <button className="text-muted-foreground hover:text-foreground ml-1 text-sm" onClick={() => setShowFullCaption(true)}>more</button>
            )}
          </div>
        )}

        {/* Media Area (Original Post's media if repost) */}
        {hasMedia ? (
          <div className="aspect-square overflow-hidden bg-black flex items-center justify-center relative group">
            {displayMedia && displayMedia.length > 0 ? (
              <>
                {displayMedia[currentMediaIndex]?.media_type === 'video' ? (
                  <>
                    <video
                      ref={videoRef}
                      src={displayMedia[currentMediaIndex]?.media_url}
                      loop
                      playsInline
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={() => {
                        if (videoRef.current?.paused) { videoRef.current?.play(); setIsVideoPlaying(true); }
                        else { videoRef.current?.pause(); setIsVideoPlaying(false); }
                      }}
                    />
                    {!isVideoPlaying && <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none"><div className="bg-black/50 rounded-full p-3"><Play className="h-10 w-10 text-white fill-white" /></div></div>}
                  </>
                ) : (
                  <img src={displayMedia[currentMediaIndex]?.media_url} alt="Post content" className="w-full h-full object-contain" loading="lazy" />
                )}

                {displayMedia.length > 1 && (
                  <>
                    {currentMediaIndex > 0 && <button onClick={() => setCurrentMediaIndex(prev => prev - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100">‹</button>}
                    {currentMediaIndex < displayMedia.length - 1 && <button onClick={() => setCurrentMediaIndex(prev => prev + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100">›</button>}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {displayMedia.map((_, index) => <div key={index} className={`h-1.5 w-1.5 rounded-full transition-all ${index === currentMediaIndex ? 'bg-white w-3' : 'bg-white/50'}`} />)}
                    </div>
                  </>
                )}
              </>
            ) : displayMediaType === 'video' ? (
              <>
                <video
                  ref={videoRef}
                  src={displayImageUrl}
                  loop
                  playsInline
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={() => {
                    if (videoRef.current?.paused) { videoRef.current?.play(); setIsVideoPlaying(true); }
                    else { videoRef.current?.pause(); setIsVideoPlaying(false); }
                  }}
                />
                {!isVideoPlaying && <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none"><div className="bg-black/50 rounded-full p-3"><Play className="h-10 w-10 text-white fill-white" /></div></div>}
              </>
            ) : (
              <img src={displayImageUrl} alt="Post content" className="w-full h-full object-contain" loading="lazy" />
            )}

            {/* Attribution overlay for Reposts */}
            {post.is_repost && post.original_post && (
              <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm flex items-center gap-2">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={post.original_post.user.avatar} />
                  <AvatarFallback>{post.original_post.user.username[0]}</AvatarFallback>
                </Avatar>
                <span>@{post.original_post.user.username}</span>
              </div>
            )}
          </div>
        ) : post.is_repost && post.original_post && post.original_post.content ? (
          // If repost has no media but original post has CONTENT, show it in a cleaner way
          <div className="px-4 py-3 bg-secondary/20 border-l-4 border-primary/50 mx-4 mb-2">
            <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
              <Avatar className="h-4 w-4">
                <AvatarImage src={post.original_post.user.avatar} />
                <AvatarFallback>{post.original_post.user.username[0]}</AvatarFallback>
              </Avatar>
              <span className="font-semibold">@{post.original_post.user.username}</span>
            </div>
            <PostCaption content={post.original_post.content} />
          </div>
        ) : null}

        {/* Actions */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={handleLike} disabled={likesLoading} className={`flex items-center gap-2 text-sm transition-colors ${isLikedPost ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}><Heart className={`h-6 w-6 ${isLikedPost ? 'fill-red-500' : ''}`} /><span className="font-semibold">{likesCountPost.toLocaleString()}</span></button>
              <button onClick={() => setShowComments(true)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-500 transition-colors"><MessageCircle className="h-6 w-6" /><span className="font-semibold">{commentsForPost.length.toLocaleString()}</span></button>
              <button onClick={handleRepost} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-green-500 transition-colors"><Repeat className="h-6 w-6" /></button>
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleShare}><Share className="h-6 w-6 hover:text-green-500 transition-colors" /></Button>
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleBookmark} disabled={bookmarksLoading}><Bookmark className={`h-6 w-6 transition-colors ${isBookmarked ? 'fill-orange-500 text-orange-500' : 'hover:text-orange-500'}`} /></Button>
          </div>
          {commentsForPost.length > 0 && (
            <button className="text-sm text-muted-foreground hover:text-foreground mt-2" onClick={() => setShowComments(true)}>View all {commentsForPost.length} comments</button>
          )}
        </div>

        {showComments && <UnifiedCommentModal content={post} type="post" onClose={() => setShowComments(false)} isOpen={showComments} />}
      </Card>

      {isEditModalOpen && <EditPostModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} post={post} />}
      {showRepostModal && <RepostModal isOpen={showRepostModal} onClose={() => setShowRepostModal(false)} post={post} />}
      <BookmarkFolderDialog isOpen={showBookmarkDialog} onClose={() => setShowBookmarkDialog(false)} postId={post.id} />
      <ReportDialog isOpen={showReportDialog} onClose={() => setShowReportDialog(false)} postId={post.id} userId={post.user_id} />
    </>
  );
};