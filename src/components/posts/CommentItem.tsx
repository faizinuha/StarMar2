import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MoreHorizontal } from "lucide-react";
import { Comment, useCreateComment } from "@/hooks/useComments";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { useLikes } from "@/hooks/useLikes";

interface CommentItemProps {
  comment: Comment;
  postId?: string;
  memeId?: string;
  level?: number;
  postOwnerId?: string;
  memeOwnerId?: string;
}

export const CommentItem = ({ comment, postId, memeId, level = 0, postOwnerId, memeOwnerId }: CommentItemProps) => {
  const { user } = useAuth();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const { mutate: createComment, isPending: isCreatingComment } = useCreateComment();
  const { likesCount, isLiked, toggleLike } = useLikes('comment', comment.id, comment.user_id);

  const handleReply = () => {
    if (!replyContent.trim()) return;

    createComment(
      {
        content: replyContent,
        postId,
        memeId,
        parentCommentId: comment.id,
        postOwnerId,
        memeOwnerId,
      },
      {
        onSuccess: () => {
          setReplyContent("");
          setShowReplyInput(false);
        },
      }
    );
  };

  const handleLike = () => {
    if (!user) return; // Or show toast
    toggleLike();
  };

  return (
    <div className={`flex items-start gap-2 ${level > 0 ? 'ml-8 pl-4 border-l border-border' : ''}`}>
      <Avatar className="h-7 w-7 mt-1">
        <AvatarImage src={comment.user.avatar} />
        <AvatarFallback className="text-xs">
          {comment.user.displayName?.[0] || comment.user.username?.[0] || ''}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-sm">
            {comment.user.displayName || comment.user.username}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm mt-0.5">{comment.content}</p>

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <button
            className={`flex items-center gap-1 text-xs hover:text-foreground transition-colors ${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
            onClick={handleLike}
          >
            <Heart className={`h-3 w-3 ${isLiked ? 'fill-red-500' : ''}`} />
            <span>{likesCount || 0}</span>
          </button>

          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowReplyInput(!showReplyInput)}
          >
            Reply
          </button>

          <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>

        {showReplyInput && (
          <div className="flex gap-2 mt-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xs">
                {user?.user_metadata?.display_name?.[0] || user?.email?.[0] || ''}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Input
                placeholder={`Reply to @${comment.user.username}...`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="h-8 text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleReply}
                disabled={!replyContent.trim() || isCreatingComment}
                className="h-8"
              >
                {isCreatingComment ? "..." : "Reply"}
              </Button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                memeId={memeId}
                level={level + 1}
                postOwnerId={postOwnerId}
                memeOwnerId={memeOwnerId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};