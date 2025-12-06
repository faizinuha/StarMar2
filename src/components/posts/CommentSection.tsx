import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCreateComment,
  useMemeComments,
  usePostComments,
} from '@/hooks/useComments';
import { useLikes } from '@/hooks/useLikes';
import { useBookmarks } from '@/hooks/useBookmarks';
import { Bookmark, Heart, Loader2, Play, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CommentItem } from './CommentItem';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  isBookmarked: boolean;
  location?: string;
  user: {
    username: string;
    displayName: string;
    avatar: string;
  };
  media_type?: string;
}

interface CommentSectionProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  memeId?: string;
  post?: Post;
}

export const CommentSection = ({
  isOpen,
  onClose,
  postId,
  memeId,
  post,
}: CommentSectionProps) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: postComments = [], isLoading: isLoadingPostComments } =
    usePostComments(postId || '');
  const { data: memeComments = [], isLoading: isLoadingMemeComments } =
    useMemeComments(memeId || '');
  const { mutate: createComment, isPending: isCreatingComment } =
    useCreateComment();
  
  // Likes functionality
  const { isLiked, toggleLike, likesCount } = useLikes('post', postId);
  
  // Bookmark functionality
  const { bookmarks, createBookmark, deleteBookmark } = useBookmarks();
  const isBookmarked = bookmarks?.some(b => b.post_id === postId);

  const comments = postId ? postComments : memeComments;
  const isLoading = postId ? isLoadingPostComments : isLoadingMemeComments;

  // Reset video state when dialog closes or post changes
  useEffect(() => {
    if (isOpen) {
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isOpen, post]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createComment(
      {
        content: newComment,
        postId,
        memeId,
        postOwnerId: post?.user_id,
        memeOwnerId: post?.user_id,
      },
      {
        onSuccess: () => {
          setNewComment('');
        },
      }
    );
  };

  const handleBookmarkToggle = () => {
    if (!user) {
      toast.error('Please log in to bookmark posts');
      return;
    }
    
    if (!postId) return;
    
    if (isBookmarked) {
      deleteBookmark.mutate(postId, {
        onSuccess: () => toast.success('Removed from bookmarks'),
      });
    } else {
      createBookmark.mutate({ postId }, {
        onSuccess: () => toast.success('Added to bookmarks'),
      });
    }
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Please log in to view and add comments.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return ( 
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl md:max-w-5xl lg:max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-full flex-col md:flex-row overflow-hidden">
          {/* Left Column: Post Image/Video */}
          {post?.image_url && (
            <div className="w-full md:w-2/3 bg-black flex items-center justify-center max-h-[40vh] md:max-h-full md:h-full relative group overflow-hidden">
              {post.media_type === 'video' ? (
                <>
                  <video
                    ref={videoRef}
                    src={post.image_url}
                    className="w-full h-full object-contain cursor-pointer"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onClick={() => {
                      if (videoRef.current?.paused) {
                        videoRef.current?.play();
                        setIsPlaying(true);
                      } else {
                        videoRef.current?.pause();
                        setIsPlaying(false);
                      }
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all">
                    {!isPlaying && (
                      <div
                        className="bg-black/50 rounded-full p-4 cursor-pointer"
                        onClick={() => {
                          videoRef.current?.play();
                          setIsPlaying(true);
                        }}
                      >
                        <Play className="h-12 w-12 text-white fill-white" />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <img
                  src={post.image_url}
                  className="w-full h-full object-contain"
                  alt="Post content"
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
          )}

          {/* Right Column: Comments and Details */}
          <div
            className={`flex flex-col min-h-0 overflow-hidden ${
              post?.image_url
                ? 'w-full md:w-1/3 h-[60vh] md:h-full'
                : 'w-full h-full'
            }`}
          >
            {/* Header with user info */}
            <div className="p-4 border-b flex-shrink-0">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={post?.user.avatar} />
                  <AvatarFallback>
                    {post?.user.displayName?.[0] || post?.user.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">
                    {post?.user.displayName || post?.user.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{post?.user.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Comments scrollable area */}
            <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-4 p-4">
                {/* Caption as first comment style */}
                {post?.content && (
                  <div className="flex items-start gap-2 pb-4 border-b">
                    <Avatar className="h-7 w-7 mt-1">
                      <AvatarImage src={post.user.avatar} />
                      <AvatarFallback className="text-xs">
                        {post.user.displayName?.[0] || post.user.username?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm">{post.user.username}</span>
                      </div>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap">{post.content}</p>
                    </div>
                  </div>
                )}

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">
                      No comments yet. Be the first to comment!
                    </p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      postId={postId}
                      memeId={memeId}
                      postOwnerId={post?.user_id}
                      memeOwnerId={post?.user_id}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Actions: Like, Share, Bookmark */}
            <div className="p-4 space-y-2 border-t flex-shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleLike()}
                  >
                    <Heart
                      className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
                    />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Send className="h-6 w-6" />
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleBookmarkToggle}
                >
                  <Bookmark className={`h-6 w-6 ${isBookmarked ? 'fill-foreground' : ''}`} />
                </Button>
              </div>
              <p className="text-sm font-semibold">{likesCount} likes</p>
            </div>

            {/* Add Comment Input */}
            <form
              onSubmit={handleSubmit}
              className="flex gap-3 p-4 border-t flex-shrink-0 bg-background"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {user?.user_metadata?.display_name?.[0] || user?.email?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                  disabled={isCreatingComment}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newComment.trim() || isCreatingComment}
                >
                  {isCreatingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
