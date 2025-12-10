import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface DeletePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  reportId: string;
  reportedUserId: string;
}

export const DeletePostDialog = ({ isOpen, onClose, postId, reportId, reportedUserId }: DeletePostDialogProps) => {
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!reason.trim()) {
      toast({ title: 'Error', description: 'Please provide a reason for deletion', variant: 'destructive' });
      return;
    }

    setIsDeleting(true);

    try {
      // Step 1: Get the post media to delete from storage
      const { data: postMedia, error: mediaFetchError } = await supabase
        .from('post_media')
        .select('media_url, media_type')
        .eq('post_id', postId);

      if (mediaFetchError) {
        console.error('Error fetching post media:', mediaFetchError);
      }

      // Step 2: Delete media files from storage
      if (postMedia && postMedia.length > 0) {
        for (const media of postMedia) {
          try {
            const url = media.media_url;
            if (url) {
              // Try multiple patterns to extract the file path
              let filePath = null;
              
              // Pattern 1: /storage/v1/object/public/posts/...
              const publicMatch = url.match(/\/storage\/v1\/object\/public\/posts\/(.+)/);
              if (publicMatch) {
                filePath = publicMatch[1];
              }
              
              // Pattern 2: Direct path without domain
              if (!filePath && !url.startsWith('http')) {
                filePath = url;
              }
              
              // Pattern 3: Full URL with domain
              if (!filePath) {
                try {
                  const urlObj = new URL(url);
                  const pathParts = urlObj.pathname.split('/posts/');
                  if (pathParts.length > 1) {
                    filePath = pathParts[1];
                  }
                } catch (e) {
                  console.error('Error parsing URL:', e);
                }
              }

              if (filePath) {
                const { error: storageError } = await supabase.storage.from('posts').remove([filePath]);
                if (storageError) {
                  console.error('Error deleting file from storage:', storageError);
                } else {
                  console.log('Successfully deleted file:', filePath);
                }
              }
            }
          } catch (mediaErr) {
            console.error('Error processing media file:', mediaErr);
          }
        }
      }

      // Step 3: Delete related records in order (likes, comments, bookmarks, post_media)
      await supabase.from('likes').delete().eq('post_id', postId);
      await supabase.from('comments').delete().eq('post_id', postId);
      await supabase.from('bookmarks').delete().eq('post_id', postId);
      await supabase.from('notifications').delete().eq('post_id', postId);
      
      // Delete the post media records
      const { error: mediaDeleteError } = await supabase
        .from('post_media')
        .delete()
        .eq('post_id', postId);

      if (mediaDeleteError) {
        console.error('Error deleting post_media records:', mediaDeleteError);
      }

      // Step 4: Delete the post itself
      const { error: postError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (postError) throw postError;

      // Step 5: Update report status to resolved
      const { error: reportError } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', reportId);

      if (reportError) {
        console.error('Error updating report:', reportError);
      }

      // Step 6: Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: user?.id,
        action: 'delete_post',
        target_user_id: reportedUserId,
        target_post_id: postId,
        details: { reason },
      });

      // Step 7: Create notification for the user whose post was deleted
      if (reportedUserId) {
        await supabase.from('user_notifications').insert({
          user_id: reportedUserId,
          title: 'Post Removed',
          message: `Your post has been removed by an admin for violating community guidelines. Reason: ${reason}`,
          type: 'warning',
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['allPosts'] });

      toast({ title: 'Success', description: 'Post deleted, media removed, and report resolved' });
      setReason('');
      onClose();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Post</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the post and all associated media. The user will be notified and the report will be automatically resolved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Deletion</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this post is being removed (this will be shown to the user)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={isDeleting || !reason.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Post'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};