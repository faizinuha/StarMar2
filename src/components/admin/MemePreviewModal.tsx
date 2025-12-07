import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface MemePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  memeId: string;
}

export function MemePreviewModal({ isOpen, onClose, memeId }: MemePreviewModalProps) {
  const { data: meme, isLoading } = useQuery({
    queryKey: ['meme-preview', memeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memes')
        .select(`
          *,
          profiles!memes_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('id', memeId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!memeId && isOpen,
  });

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meme Preview</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : meme ? (
          <div className="space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={meme.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {meme.profiles?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">
                  {meme.profiles?.display_name || meme.profiles?.username}
                </p>
                <p className="text-sm text-muted-foreground">
                  @{meme.profiles?.username}
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                {formatDistanceToNow(new Date(meme.created_at), { addSuffix: true })}
              </Badge>
            </div>

            {/* Media */}
            {meme.media_url && (
              <div className="rounded-lg overflow-hidden bg-muted">
                {meme.media_type?.startsWith('video') ? (
                  <video
                    src={supabase.storage.from('memes').getPublicUrl(meme.media_url).data.publicUrl}
                    controls
                    className="w-full max-h-96 object-contain"
                  />
                ) : (
                  <img
                    src={supabase.storage.from('memes').getPublicUrl(meme.media_url).data.publicUrl}
                    alt="Meme content"
                    className="w-full max-h-96 object-contain"
                  />
                )}
              </div>
            )}

            {/* Caption */}
            {meme.caption && (
              <p className="text-sm">{meme.caption}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{meme.likes_count || 0} likes</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{meme.comments_count || 0} comments</span>
              </div>
            </div>

            {/* Meme ID */}
            <div className="text-xs text-muted-foreground border-t pt-2">
              <p>Meme ID: {meme.id}</p>
              <p>User ID: {meme.user_id}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Meme not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
