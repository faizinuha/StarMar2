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

// Import hooks and components needed for functionality
import { useAuth } from '@/contexts/AuthContext';
import {
  Comment,
  useCreateComment,
  usePostComments,
} from '@/hooks/useComments';
import { useLikes } from '@/hooks/useLikes';

import { Post } from '@/hooks/usePosts';
// import { MorePosts } from './MorePosts';

interface PostDetailModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
}

// A simple component to render a single comment item, extracted from CommentSection.tsx logic
const CommentItem = ({
  comment,
  isCaption = false,
}: {
  comment: Partial<Comment> & {
    user: { username?: string; displayName?: string; avatar?: string; avatar_url?: string };
    content: string;
    created_at: string;
  };
  isCaption?: boolean;
}) => (
  <div
    className={`flex items-start space-x-3 ${isCaption ? 'pb-4 border-b mb-4' : ''
      }`}
  >
    <Avatar className="h-8 w-8">
      <AvatarImage src={comment.user.avatar || comment.user.avatar_url} />
      <AvatarFallback>
        {comment.user.displayName?.charAt(0) ||
          comment.user.username?.charAt(0) ||
          'U'}
      </AvatarFallback>
    </Avatar>
    <div className="text-sm">
      <p>
        <span className="font-semibold">{comment.user.username}</span>
        <span className="ml-2 whitespace-pre-wrap">{comment.content}</span>
      </p>
      {!isCaption && (
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(comment.created_at), {
            addSuffix: true,
          })}
        </p>
      )}
    </div>
  </div>
);

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

  if (!post) return null;

  // Get all media for this post
  const postMedia = post.media || (post.image_url ? [{ media_url: post.image_url, media_type: post.media_type || 'image' }] : []);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createComment(
      { content: newComment, postId: post.id },
      { onSuccess: () => setNewComment('') }
    );
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
            <div className="p-4 border-b">
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
            <ScrollArea className="flex-1 min-h-0 fixed-top border-b">
              <div className="p-4 space-y-4">
                {/* Post Caption (only if there's media) */}
                {post.content && postMedia.length > 0 && (
                  <div className="pb-4 border-b mb-4">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={post.user.avatar} />
                        <AvatarFallback>
                          {getInitials(post.user.displayName || post.user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <p>
                          <span className="font-semibold">{post.user.username}</span>
                          <span className="ml-2 whitespace-pre-wrap">{post.content}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {areCommentsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))
                )}
              </div>

              {/* More Posts Section
              <MorePosts userId={post.user_id} currentPostId={post.id} /> */}
            </ScrollArea>

            {/* Actions and Likes (Moved outside ScrollArea) */}
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleLike()}
                  >
                    <Heart
                      className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : ''
                        }`}
                    />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MessageCircle className="h-6 w-6" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Send className="h-6 w-6" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon">
                  <Bookmark className="h-6 w-6" />
                </Button>
              </div>
              <p className="text-sm font-semibold">{likesCount} likes</p>
            </div>

            {/* Add Comment Input */}
            <form
              onSubmit={handleCommentSubmit}
              className="flex gap-2 p-4 border-t"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {getInitials(user?.user_metadata?.display_name)}
                </AvatarFallback>
              </Avatar>
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
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
                  'Post'
                )}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};