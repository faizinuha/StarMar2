import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

interface WarnMuteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string | null;
  onSuccess?: () => void;
}

export const WarnMuteDialog = ({ isOpen, onClose, userId, username, onSuccess }: WarnMuteDialogProps) => {
  const [type, setType] = useState<'warning' | 'mute'>('warning');
  const [reason, setReason] = useState('');
  const [muteDuration, setMuteDuration] = useState('1h');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const getMuteUntil = () => {
    const now = new Date();
    switch (muteDuration) {
      case '1h': return new Date(now.getTime() + 60 * 60 * 1000);
      case '6h': return new Date(now.getTime() + 6 * 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '3d': return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() + 60 * 60 * 1000);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({ title: 'Error', description: 'Please provide a reason.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase.from('user_warnings').insert({
        user_id: userId,
        warned_by: user.id,
        type,
        reason,
        mute_until: type === 'mute' ? getMuteUntil().toISOString() : null,
      });

      if (error) throw error;

      // Send notification to user
      await supabase.from('user_notifications').insert({
        user_id: userId,
        title: type === 'warning' ? '⚠️ Warning' : '🔇 Account Muted',
        message: type === 'warning'
          ? `Kamu mendapat peringatan: ${reason}`
          : `Akun kamu di-mute selama ${muteDuration}. Alasan: ${reason}`,
        type: 'warning',
      });

      toast({ title: 'Success', description: `${type === 'warning' ? 'Warning' : 'Mute'} issued to @${username}.` });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Warn / Mute User</DialogTitle>
          <DialogDescription>Issue a warning or temporarily mute @{username}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Action Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'warning' | 'mute')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="warning">⚠️ Warning</SelectItem>
                <SelectItem value="mute">🔇 Mute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'mute' && (
            <div className="space-y-2">
              <Label>Mute Duration</Label>
              <Select value={muteDuration} onValueChange={setMuteDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="6h">6 Hours</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="3d">3 Days</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Processing...' : type === 'warning' ? 'Send Warning' : 'Mute User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
