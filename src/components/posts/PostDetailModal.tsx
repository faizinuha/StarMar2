import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageCarousel } from './ImageCarousel';
import { formatDistanceToNow } from 'date-fns';
import {
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  Send,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// Import hooks and components needed for functionality
import { useAuth } from '@/contexts/AuthContext';
import {
  useCreateComment,
  usePostComments,
} from '@/hooks/useComments';
import { useLikes } from '@/hooks/useLikes';
import { useBookmarks } from '@/hooks/useBookmarks';
import { CommentItem } from './CommentItem';

import { Post } from '@/hooks/usePosts';

interface PostDetailModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PostDetailModal = ({
  post,
  isOpen,
  onClose,
}: PostDetailModalProps) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');

  // Hooks for functionality
  const postId = post?.id as string | undefined;
  const { isLiked, toggleLike, likesCount } = useLikes('post', postId);
  const { data: comments = [], isLoading: areCommentsLoading } =
    usePostComments(postId || '');
  const { mutate: createComment, isPending: isCreatingComment } =
    useCreateComment();
  
  // Bookmark functionality
  const { bookmarks, createBookmark, deleteBookmark } = useBookmarks();
  const isBookmarked = bookmarks?.some(b => b.post_id === postId);

  if (!post) return null;

  // Get all media for this post
  const postMedia = post.media || (post.image_url ? [{ media_url: post.image_url, media_type: post.media_type || 'image' }] : []);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createComment(
      { content: newComment, postId: post.id, postOwnerId: post.user_id },
      { onSuccess: () => setNewComment('') }
    );
  };

  const handleBookmarkToggle = () => {
    if (!user) {
      toast.error('Please log in to bookmark posts');
      return;
    }
    
    if (isBookmarked) {
      deleteBookmark.mutate(post.id, {
        onSuccess: () => toast.success('Removed from bookmarks'),
      });
    } else {
      createBookmark.mutate({ postId: post.id }, {
        onSuccess: () => toast.success('Added to bookmarks'),
      });
    }
  };

  const getInitials = (name?: string) => {
    return name ? name.substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl md:max-w-5xl lg:max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-full flex-col md:flex-row overflow-hidden">
          {/* Left Column: Media */}
          {postMedia.length > 0 ? (
            <div className="w-full md:w-2/3 bg-black flex items-center justify-center h-[50vh] md:h-full">
              <ImageCarousel images={postMedia} />
            </div>
          ) : (
            /* Text-only posts: show centered caption with padding and smaller height on mobile */
            <div className="w-full md:w-2/3 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center h-[50vh] md:h-full">
              <p className="text-lg md:text-xl text-center whitespace-pre-wrap px-6 py-8 max-w-prose">
                {post.content}
              </p>
            </div>
          )}

          {/* Right Column: Comments and Details */}
          <div className="w-full md:w-1/3 bg-card text-card-foreground flex flex-col h-full min-h-0">
            {/* Header */}
            <div className="p-4 border-b flex-shrink-0">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={post.user.avatar} />
                  <AvatarFallback>
                    {getInitials(post.user.displayName || post.user.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">
                    {post.user.displayName || post.user.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{post.user.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Comments Section (Scrollable) */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4">
                {/* Post Caption (only if there's media) */}
                {post.content && postMedia.length > 0 && (
                  <div className="flex items-start gap-2 pb-4 border-b">
                    <Avatar className="h-7 w-7 mt-1">
                      <AvatarImage src={post.user.avatar} />
                      <AvatarFallback className="text-xs">
                        {getInitials(post.user.displayName || post.user.username)}
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

                {areCommentsLoading ? (
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
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        postId={postId}
                        postOwnerId={post.user_id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Actions and Likes */}
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
                    <MessageCircle className="h-6 w-6" />
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
              onSubmit={handleCommentSubmit}
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
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={isCreatingComment}
                  className="flex-1"
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
