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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

export const EditUserModal = ({ user, isOpen, onClose }) => {
  const [roles, setRoles] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserRoles = async () => {
      if (user?.user_id) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.user_id);
        
        if (data) {
          setRoles(data.map(r => r.role));
        }
      }
    };

    if (user) {
      fetchUserRoles();
      setIsVerified(user.is_verified === 'verified');
    }
  }, [user]);

  const handleRoleToggle = (role: string, checked: boolean) => {
    if (checked) {
      setRoles([...roles, role]);
    } else {
      setRoles(roles.filter(r => r !== role));
    }
  };

  const handleSave = async () => {
    if (!user || !user.user_id) return;

    setIsSaving(true);

    try {
      // Determine the primary role to display in profiles table
      let primaryRole = 'user';
      if (roles.includes('admin')) {
        primaryRole = 'admin';
      } else if (roles.includes('moderator')) {
        primaryRole = 'moderator';
      } else if (roles.includes('user')) {
        primaryRole = 'user';
      }

      // Use security definer function to update profile (avoids RLS recursion)
      const { error: profileError } = await supabase.rpc('admin_update_profile', {
        target_user_id: user.user_id,
        update_data: {
          is_verified: isVerified ? 'verified' : null,
          role: primaryRole
        }
      });

      if (profileError) throw profileError;

      // Delete all existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.user_id);

      // Insert new roles
      if (roles.length > 0) {
        const { error: rolesError } = await supabase
          .from('user_roles')
          .insert(roles.map(role => ({ 
            user_id: user.user_id, 
            role: role as 'admin' | 'moderator' | 'user'
          })));

        if (rolesError) throw rolesError;
      }

      toast({ 
        title: 'User updated successfully', 
        description: `Roles and verification status for @${user.username} have been updated.` 
      });
      
      // Return updated user with new role
      onClose({ ...user, is_verified: isVerified ? 'verified' : null, role: primaryRole });
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({ 
        title: 'Error updating user', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
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
          <div className="space-y-4">
            <Label>Roles</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="role-user"
                  checked={roles.includes('user')}
                  onCheckedChange={(checked) => handleRoleToggle('user', checked as boolean)}
                />
                <label htmlFor="role-user" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  User
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="role-moderator"
                  checked={roles.includes('moderator')}
                  onCheckedChange={(checked) => handleRoleToggle('moderator', checked as boolean)}
                />
                <label htmlFor="role-moderator" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Moderator
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="role-admin"
                  checked={roles.includes('admin')}
                  onCheckedChange={(checked) => handleRoleToggle('admin', checked as boolean)}
                />
                <label htmlFor="role-admin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Admin
                </label>
              </div>
            </div>
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