import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ImageCarousel } from './ImageCarousel';
import { GifPicker } from './GifPicker';
import { formatDistanceToNow } from 'date-fns';
import {
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  Send,
  Image as ImageIcon,
  X,
  Play,
  Smile,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCreateComment,
  usePostComments,
  useMemeComments,
} from '@/hooks/useComments';
import { useLikes } from '@/hooks/useLikes';
import { useBookmarks } from '@/hooks/useBookmarks';
import { CommentItem } from './CommentItem';
import { BookmarkFolderDialog } from './BookmarkFolderDialog';
import { supabase } from '@/integrations/supabase/client';

// Universal media type for both posts and memes
interface MediaItem {
  media_url: string;
  media_type: string;
}

// Universal content props - works for both posts and memes
interface ContentData {
  id: string;
  user_id: string;
  content?: string;
  caption?: string;
  image_url?: string;
  media_url?: string;
  media_type?: string;
  media?: MediaItem[];
  likes?: number;
  likes_count?: number;
  comments?: number;
  comments_count?: number;
  user: {
    username: string;
    displayName?: string;
    display_name?: string;
    avatar?: string;
    avatar_url?: string;
  };
}

interface UnifiedCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContentData | null;
  type: 'post' | 'meme';
}

export const UnifiedCommentModal = ({
  isOpen,
  onClose,
  content,
  type,
}: UnifiedCommentModalProps) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine IDs based on type
  const postId = type === 'post' ? content?.id : undefined;
  const memeId = type === 'meme' ? content?.id : undefined;

  // Hooks for functionality
  const { isLiked, toggleLike, likesCount } = useLikes(type, content?.id);
  const { data: postComments = [], isLoading: isLoadingPostComments } = usePostComments(postId || '');
  const { data: memeComments = [], isLoading: isLoadingMemeComments } = useMemeComments(memeId || '');
  const { mutate: createComment, isPending: isCreatingComment } = useCreateComment();
  
  // Bookmark functionality
  const { bookmarks, createBookmark, deleteBookmark } = useBookmarks();
  const isBookmarked = bookmarks?.some(b => b.post_id === content?.id);

  const comments = type === 'post' ? postComments : memeComments;
  const isLoading = type === 'post' ? isLoadingPostComments : isLoadingMemeComments;

  // Reset video state when dialog closes
  useEffect(() => {
    if (isOpen) {
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isOpen]);

  if (!content) return null;

  // Normalize content data
  const displayName = content.user.displayName || content.user.display_name || content.user.username;
  const avatar = content.user.avatar || content.user.avatar_url;
  const caption = content.content || content.caption || '';
  const totalLikes = likesCount || content.likes || content.likes_count || 0;

  // Get media for display
  const getMedia = (): MediaItem[] => {
    if (content.media && content.media.length > 0) {
      return content.media;
    }
    if (content.image_url) {
      return [{ media_url: content.image_url, media_type: content.media_type || 'image' }];
    }
    if (content.media_url) {
      return [{ media_url: content.media_url, media_type: content.media_type || 'image' }];
    }
    return [];
  };

  const mediaItems = getMedia();
  const hasMedia = mediaItems.length > 0;
  const isVideo = mediaItems.length === 1 && mediaItems[0].media_type === 'video';

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && !attachedImage) return;

    createComment(
      { 
        content: newComment, 
        imageUrl: attachedImage || undefined,
        postId: postId,
        memeId: memeId,
        postOwnerId: type === 'post' ? content.user_id : undefined,
        memeOwnerId: type === 'meme' ? content.user_id : undefined,
      },
      { 
        onSuccess: () => {
          setNewComment('');
          setAttachedImage(null);
        } 
      }
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diperbolehkan');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `comment_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `comments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      setAttachedImage(urlData.publicUrl);
      toast.success('Gambar berhasil diupload');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Gagal mengupload gambar');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    setAttachedImage(gifUrl);
    setShowGifPicker(false);
  };

  const removeAttachment = () => {
    setAttachedImage(null);
  };

  const handleBookmarkToggle = () => {
    if (!user) {
      toast.error('Please log in to bookmark');
      return;
    }
    
    if (type === 'post') {
      if (isBookmarked) {
        deleteBookmark.mutate(content.id, {
          onSuccess: () => toast.success('Removed from bookmarks'),
        });
      } else {
        setShowBookmarkDialog(true);
      }
    } else {
      // For memes, just toggle without folder
      if (isBookmarked) {
        deleteBookmark.mutate(content.id, {
          onSuccess: () => toast.success('Removed from bookmarks'),
        });
      } else {
        createBookmark.mutate({ postId: content.id }, {
          onSuccess: () => toast.success('Added to bookmarks'),
        });
      }
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/${type}/${content.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: displayName,
          text: caption,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Link copied to clipboard!');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const getInitials = (name?: string) => {
    return name ? name.substring(0, 2).toUpperCase() : 'U';
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl md:max-w-5xl lg:max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden">
          <div className="flex h-full flex-col md:flex-row overflow-hidden">
            {/* Left Column: Media */}
            {hasMedia ? (
              <div className="w-full md:w-2/3 bg-black flex items-center justify-center h-[50vh] md:h-full relative group">
                {isVideo ? (
                  <>
                    <video
                      ref={videoRef}
                      src={mediaItems[0].media_url}
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
                    {!isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div
                          className="bg-black/50 rounded-full p-4 cursor-pointer"
                          onClick={() => {
                            videoRef.current?.play();
                            setIsPlaying(true);
                          }}
                        >
                          <Play className="h-12 w-12 text-white fill-white" />
                        </div>
                      </div>
                    )}
                  </>
                ) : mediaItems.length === 1 ? (
                  <img
                    src={mediaItems[0].media_url}
                    className="w-full h-full object-contain"
                    alt="Content"
                    loading="lazy"
                  />
                ) : (
                  <ImageCarousel images={mediaItems} />
                )}
              </div>
            ) : (
              /* Text-only content */
              <div className="w-full md:w-2/3 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center h-[50vh] md:h-full">
                <p className="text-lg md:text-xl text-center whitespace-pre-wrap px-6 py-8 max-w-prose">
                  {caption}
                </p>
              </div>
            )}

            {/* Right Column: Comments and Details */}
            <div className="w-full md:w-1/3 bg-card text-card-foreground flex flex-col h-full min-h-0">
              {/* Header */}
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={avatar} />
                    <AvatarFallback>
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      @{content.user.username}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comments Section (Scrollable) */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-4">
                  {/* Caption (only if there's media) */}
                  {caption && hasMedia && (
                    <div className="flex items-start gap-2 pb-4 border-b">
                      <Avatar className="h-7 w-7 mt-1">
                        <AvatarImage src={avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="font-semibold text-sm">{content.user.username}</span>
                        <p className="text-sm mt-0.5 whitespace-pre-wrap">{caption}</p>
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
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          postId={postId}
                          memeId={memeId}
                          postOwnerId={type === 'post' ? content.user_id : undefined}
                          memeOwnerId={type === 'meme' ? content.user_id : undefined}
                        />
                      ))}
                    </div>
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
                      <MessageCircle className="h-6 w-6" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleShare}>
                      <Send className="h-6 w-6" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleBookmarkToggle}
                  >
                    <Bookmark className={`h-6 w-6 ${isBookmarked ? 'fill-orange-500 text-orange-500' : ''}`} />
                  </Button>
                </div>
                <p className="text-sm font-semibold">{totalLikes} likes</p>
              </div>

              {/* Add Comment Input */}
              <div className="p-4 border-t flex-shrink-0 bg-background space-y-2">
                {/* Attached Image Preview */}
                {attachedImage && (
                  <div className="relative inline-block">
                    <img 
                      src={attachedImage} 
                      alt="Attachment" 
                      className="h-20 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeAttachment}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {user?.user_metadata?.display_name?.[0] || user?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 flex gap-1 items-center">
                    <Input
                      placeholder="Tulis komentar..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      disabled={isCreatingComment || isUploadingImage}
                      className="flex-1"
                    />
                    
                    {/* Image Upload */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage || !!attachedImage}
                      className="h-8 w-8"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </Button>

                    {/* GIF Picker */}
                    <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={!!attachedImage}
                          className="h-8 w-8"
                        >
                          <Smile className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
                      </PopoverContent>
                    </Popover>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={(!newComment.trim() && !attachedImage) || isCreatingComment}
                      className="h-8"
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Bookmark Folder Dialog */}
      <BookmarkFolderDialog
        isOpen={showBookmarkDialog}
        onClose={() => setShowBookmarkDialog(false)}
        postId={content.id}
      />
    </>
  );
};
