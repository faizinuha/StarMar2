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
import { Image as ImageIcon, Loader2, Video as VideoIcon, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface SimpleCreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimpleCreatePostModal = ({ isOpen, onClose }: SimpleCreatePostModalProps) => {
  const { user } = useAuth();
  const { data: userProfile } = useProfile();
  const { toast } = useToast();

  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const MAX_CHARS = 500;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const currentCount = files.length;

      // Limit to 4 media items for this simple view
      if (currentCount + selectedFiles.length > 4) {
        toast({
          title: "Too many files",
          description: "You can only select up to 4 media items.",
          variant: "destructive"
        });
        return;
      }

      const newFiles = [...files, ...selectedFiles];
      setFiles(newFiles);

      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!caption.trim() && files.length === 0) {
      toast({
        title: "Empty post",
        description: "Please add some text or media to your post.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // 1. Upload files first
      const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${index}.${fileExt}`;
        const bucket = 'posts';

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return {
          url: data.publicUrl,
          type: file.type.startsWith('image/') ? 'image' : 'video',
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // 2. Create Post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: caption,
          likes_count: 0,
          comments_count: 0
        })
        .select('id')
        .single();

      if (postError) throw postError;
      if (!post) throw new Error("Failed to create post record");

      // 3. Insert Media Records
      if (uploadedFiles.length > 0) {
        const mediaInserts = uploadedFiles.map((file, index) => ({
          post_id: post.id,
          media_url: file.url,
          media_type: file.type,
          order_index: index,
        }));

        const { error: mediaError } = await supabase
          .from('post_media')
          .insert(mediaInserts);

        if (mediaError) throw mediaError;
      }

      // 4. Handle Hashtags (Simple extraction)
      const hashtagRegex = /#(\w+)/g;
      const hashtags = caption.match(hashtagRegex)?.map(tag => tag.substring(1).toLowerCase()) || [];
      const uniqueHashtags = [...new Set(hashtags)];

      if (uniqueHashtags.length > 0) {
        // Upsert hashtags then link them
        for (const tag of uniqueHashtags) {
          const { data: tagData } = await supabase
            .from('hashtags')
            .upsert({ name: tag }, { onConflict: 'name' })
            .select('id')
            .single();

          if (tagData) {
            await supabase
              .from('post_hashtags')
              .insert({ post_id: post.id, hashtag_id: tagData.id })
 .select(); // Simple ignore if duplicate link
          }
        }
      }

      toast({ title: "Post created successfully!" });
      handleClose();

    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error creating post",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setCaption('');
    setFiles([]);
    setPreviews([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border/50">
          <DialogTitle className="text-xl font-semibold">Create New Post</DialogTitle>
        </DialogHeader>

        <div className="p-4 flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userProfile?.avatar_url || ''} />
            <AvatarFallback>{userProfile?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            <div>
              <p className="font-semibold text-sm">@{userProfile?.username || 'user'}</p>
            </div>

            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CHARS))}
              placeholder="What's happening? Use #hashtags to categorize your post."
              className="min-h-[120px] resize-none border-none focus-visible:ring-0 p-0 text-base placeholder:text-muted-foreground/60 bg-transparent"
            />

            {/* Media Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-border/50 aspect-video bg-black/50">
                    <button
                      onClick={() => removeFile(idx)}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {files[idx].type.startsWith('video') ? (
                      <video src={src} className="w-full h-full object-contain" controls />
                    ) : (
                      <img src={src} className="w-full h-full object-cover" alt="Preview" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-border/50 w-full my-2" />

            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={imageInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileSelect(e, 'image')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>

                <input
                  type="file"
                  ref={videoInputRef}
                  className="hidden"
                  accept="video/*"
                  multiple
                  onChange={(e) => handleFileSelect(e, 'video')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <VideoIcon className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground font-medium">
                  {caption.length}/{MAX_CHARS}
                </span>
                <Button
                  onClick={handleSubmit}
                  disabled={uploading || (!caption.trim() && files.length === 0)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full px-6 transition-transform active:scale-95"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Post"
                  )}
                </Button>
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
