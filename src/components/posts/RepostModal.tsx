import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Repeat } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Post } from './PostCard';

interface RepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
}

export const RepostModal = ({ isOpen, onClose, post }: RepostModalProps) => {
  const { user } = useAuth();
  const { data: userProfile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const MAX_CHARS = 500;

  const handleSubmit = async () => {
    if (!user) return;

    setUploading(true);

    try {
      // Create Repost Record
      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: caption, // User's thought
          likes_count: 0,
          comments_count: 0,
          is_repost: true,
          original_post_id: post.id,
          // We don't necessarily set repost_by here, usually it's inferred from user_id if is_repost is true
          // But depending on backend logic, we stick to standard inserts.
        })
        .select('id')
        .single();

      if (error) throw error;

      // Invalidate queries so repost count and feed update
      queryClient.invalidateQueries({ queryKey: ['allPosts'] });
      queryClient.invalidateQueries({ queryKey: ['repostCount', post.id] });
      toast({ title: "Reposted successfully!" });
      handleClose();

    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error reposting",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setCaption('');
    onClose();
  };

  // Determine media preview - check both media array and image_url
  const postMedia = post.media && post.media.length > 0 ? post.media : 
    (post.original_post?.media && post.original_post.media.length > 0 ? post.original_post.media : null);
  const previewMedia = postMedia ? postMedia[0] : null;
  const previewImage = previewMedia ? previewMedia.media_url : (post.image_url || post.original_post?.image_url);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border/50">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Repost
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userProfile?.avatar_url || ''} />
            <AvatarFallback>{userProfile?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            {/* User Input Area */}
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Add a thought..."
              className="resize-none border-none focus-visible:ring-0 p-0 text-base placeholder:text-muted-foreground/60 bg-transparent min-h-[50px]"
              autoFocus
            />

            {/* Embedded Original Post Preview */}
            <div className="border border-border rounded-lg p-3 bg-secondary/30 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={post.user.avatar} />
                  <AvatarFallback>{post.user.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-sm">{post.user.displayName}</span>
                <span className="text-muted-foreground text-xs">@{post.user.username}</span>
              </div>

              <div className="text-sm text-foreground/90 mb-2 line-clamp-3">
                {post.content}
              </div>

              {/* Media Thumbnail */}
              {previewImage && (
                <div className="rounded-md overflow-hidden max-h-[200px] w-full bg-black/50 flex justify-center">
                  {previewMedia?.media_type === 'video' ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <video src={previewImage} className="max-h-[200px] max-w-full" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        {/* Play Icon placeholder or just visual cue */}
                      </div>
                    </div>
                  ) : (
                    <img src={previewImage} alt="Preview" className="max-h-[200px] object-contain" />
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground font-medium">
                {caption.length}/{MAX_CHARS}
              </span>
              <Button
                onClick={handleSubmit}
                disabled={uploading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full px-6 transition-transform active:scale-95"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Repost"
                )}
              </Button>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
