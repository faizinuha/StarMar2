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

interface BanUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string | null;
  isBanned: boolean;
  onSuccess?: () => void;
}

export const BanUserDialog = ({ 
  isOpen, 
  onClose, 
  userId, 
  username, 
  isBanned, 
  onSuccess 
}: BanUserDialogProps) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!isBanned && !reason.trim()) {
      toast({ title: 'Error', description: 'Please provide a reason for banning', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Use security definer function to bypass RLS
      const { error: profileError } = await supabase.rpc('admin_update_ban_status', {
        target_user_id: userId,
        is_banned_val: !isBanned,
        ban_reason_val: isBanned ? null : reason,
        banned_by_val: isBanned ? null : user?.id,
      });

      if (profileError) throw profileError;

      // Log admin action
      await supabase
        .from('admin_logs')
        .insert({
          admin_id: user?.id,
          action: isBanned ? 'unban_user' : 'ban_user',
          target_user_id: userId,
          details: { reason, username },
        });

      // Create notification for the user
      await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          title: isBanned ? 'Account Restored' : 'Account Suspended',
          message: isBanned 
            ? 'Your account has been restored. You can now use all features again.'
            : `Your account has been suspended. Reason: ${reason}`,
          type: isBanned ? 'info' : 'warning',
        });

      toast({ 
        title: 'Success', 
        description: isBanned 
          ? `User @${username} has been unbanned` 
          : `User @${username} has been banned` 
      });
      
      setReason('');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error updating ban status:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBanned ? 'Unban User' : 'Ban User'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBanned 
              ? `Are you sure you want to unban @${username}? They will regain access to their account.`
              : `This will prevent @${username} from accessing their account. They will see a checkpoint page explaining the ban.`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {!isBanned && (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Ban</Label>
              <Textarea
                id="reason"
                placeholder="Explain why this user is being banned..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be shown to the user on their checkpoint page.
              </p>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleSubmit} 
            disabled={isSubmitting || (!isBanned && !reason.trim())}
            className={isBanned ? '' : 'bg-destructive hover:bg-destructive/90'}
          >
            {isSubmitting ? 'Processing...' : (isBanned ? 'Unban User' : 'Ban User')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};