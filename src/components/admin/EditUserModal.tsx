import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

export const EditUserModal = ({ user, isOpen, onClose }) => {
  const [role, setRole] = useState('user');
  const [isVerified, setIsVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setRole(user.role || 'user');
      setIsVerified(user.is_verified === 'verified');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user || !user.user_id) return;

    setIsSaving(true);

    const { data, error } = await supabase
      .from('profiles')
      .update({
        role,
        is_verified: isVerified ? 'verified' : null,
      })
      .eq('user_id', user.user_id)
      .select()
      .single();

    // Check if the first attempt failed because the row was not found
    if (error && error.code === 'PGRST116') {
      console.warn(`Update with user_id failed, retrying with id for user: ${user.username}`);
      // Retry with the primary key 'id' as a fallback
      const { data: retryData, error: retryError } = await supabase
        .from('profiles')
        .update({ role, is_verified: isVerified ? 'verified' : null })
        .eq('id', user.id) // Fallback to 'id'
        .select()
        .single();

      if (retryError) {
        console.error('Error updating user on retry:', retryError);
        toast({ title: 'Error updating user', description: retryError.message, variant: 'destructive' });
      } else if (retryData) {
        toast({ title: 'User updated successfully', description: `Role and verification status for @${retryData.username} have been updated.` });
        onClose(retryData); // Pass updated data back
      }
    } else if (error) {
      console.error('Error updating user:', error);
      toast({ title: 'Error updating user', description: error.message, variant: 'destructive' });
    } else if (data) {
      toast({ title: 'User updated successfully', description: `Role and verification status for @${data.username} have been updated.` });
      onClose(data); // Pass updated data back
    }

    setIsSaving(false);
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Make changes to the role and verification status for @{user?.username}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="verified" className="text-right">
              Verified
            </Label>
            <Switch
              id="verified"
              checked={isVerified}
              onCheckedChange={setIsVerified}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};