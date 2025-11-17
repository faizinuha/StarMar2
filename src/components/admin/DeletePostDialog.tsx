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

  const handleDelete = async () => {
    if (!reason.trim()) {
      toast({ title: 'Error', description: 'Please provide a reason for deletion', variant: 'destructive' });
      return;
    }

    setIsDeleting(true);

    try {
      // Mark post as deleted with reason
      const { error: postError } = await supabase
        .from('posts')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
          delete_reason: reason,
        })
        .eq('id', postId);

      if (postError) throw postError;

      // Update report status
      const { error: reportError } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', reportId);

      if (reportError) throw reportError;

      // Create notification for the user whose post was deleted
      const { error: notifError } = await supabase
        .from('user_notifications')
        .insert({
          user_id: reportedUserId,
          title: 'Post Removed',
          message: `Your post has been removed by an admin. Reason: ${reason}`,
          type: 'warning',
        });

      if (notifError) throw notifError;

      toast({ title: 'Success', description: 'Post deleted and user notified' });
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
            This action cannot be undone. The user will be notified about the deletion.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Deletion</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this post is being removed..."
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
