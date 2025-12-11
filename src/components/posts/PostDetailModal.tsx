import { Post } from '@/hooks/usePosts';
import { UnifiedCommentModal } from './UnifiedCommentModal';

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
  if (!post) return null;

  return (
    <UnifiedCommentModal
      content={post}
      type="post"
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};
