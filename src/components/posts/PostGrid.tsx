import { useState } from "react";
import { Post } from "@/hooks/usePosts";
import { Heart, MessageCircle } from "lucide-react";

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

  return (
    <div 
      className="aspect-square relative overflow-hidden cursor-pointer bg-muted group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {post.image_url ? (
        (post.media_type === 'video' ? (
          <video 
            src={post.image_url} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <img 
            src={post.image_url} 
            alt="Post" 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ))
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
          <div className="text-center p-4">
            <div className="text-xs font-medium text-foreground/80 line-clamp-4">
              {post.content}
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
              <span className="font-semibold">{post.likes}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="h-5 w-5 fill-white" />
              <span className="font-semibold">{post.comments}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};