import { Post } from "@/hooks/usePosts";
import { Heart, MessageCircle, Play } from "lucide-react";
import { useState } from "react";

interface PostGridProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
}

export const PostGrid = ({ posts, onPostClick }: PostGridProps) => {
  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map((post) => (
        <PostGridItem
          key={post.id}
          post={post}
          onClick={() => onPostClick(post)}
        />
      ))}
    </div>
  );
};

interface PostGridItemProps {
  post: Post;
  onClick: () => void;
}

const PostGridItem = ({ post, onClick }: PostGridItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get the image URL from multiple possible sources
  const getImageUrl = () => {
    // First check if there's a direct image_url
    if (post.image_url && typeof post.image_url === 'string' && post.image_url.startsWith('http')) {
      return post.image_url;
    }
    
    // Check media array
    if (post.media && Array.isArray(post.media) && post.media.length > 0) {
      const firstMedia = post.media[0];
      if (firstMedia?.media_url) {
        return firstMedia.media_url;
      }
    }
    
    return null;
  };

  const getMediaType = () => {
    // Check direct media_type
    if (post.media_type) {
      return post.media_type;
    }
    
    // Check media array for type
    if (post.media && Array.isArray(post.media) && post.media.length > 0) {
      const firstMedia = post.media[0];
      if (firstMedia?.media_type) {
        return firstMedia.media_type;
      }
    }
    
    return 'image';
  };

  const imageUrl = getImageUrl();
  const mediaType = getMediaType();
  const isVideo = mediaType === 'video' || (imageUrl && imageUrl.includes('.mp4'));

  return (
    <div
      className="aspect-square relative overflow-hidden cursor-pointer bg-muted group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {imageUrl && !imageError ? (
        isVideo ? (
          <>
            <video
              src={imageUrl}
              poster={imageUrl}
              preload="metadata"
              muted
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
            {/* Video indicator */}
            <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5">
              <Play className="h-4 w-4 text-white fill-white" />
            </div>
          </>
        ) : (
          <img
            src={imageUrl}
            alt="Post"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
          <div className="text-center p-4">
            <div className="text-xs font-medium text-foreground/80 line-clamp-4">
              {post.content || 'Post'}
            </div>
          </div>
        </div>
      )}

      {/* Hover overlay with stats */}
      {isHovered && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300">
          <div className="flex items-center space-x-6 text-white">
            <div className="flex items-center space-x-1">
              <Heart className="h-5 w-5 fill-white" />
              <span className="font-semibold">{post.likes || post.likes_count || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="h-5 w-5 fill-white" />
              <span className="font-semibold">{post.comments || post.comments_count || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};