import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Copy, Flag, Ban, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ReportUserDialog } from './ReportUserDialog';
import { BanUserDialog } from '@/components/admin/BanUserDialog';
import { supabase } from '@/integrations/supabase/client';

interface ProfileMenuProps {
  userId: string;
  username: string | null;
  isOwnProfile: boolean;
  isBanned?: boolean;
  onBanStatusChange?: () => void;
}

export const ProfileMenu = ({ userId, username, isOwnProfile, isBanned = false, onBanStatusChange }: ProfileMenuProps) => {
  const { user } = useAuth();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userIsBanned, setUserIsBanned] = useState(isBanned);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
    };
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    setUserIsBanned(isBanned);
  }, [isBanned]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(userId);
    toast.success('User ID copied to clipboard');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isOwnProfile ? (
            <>
              <DropdownMenuItem onClick={handleCopyId}>
                <Copy className="h-4 w-4 mr-2" />
                Copy User ID
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="text-red-500">
                <Flag className="h-4 w-4 mr-2" />
                Report User
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowBanDialog(true)} className={userIsBanned ? 'text-green-500' : 'text-red-500'}>
                    {userIsBanned ? (
                      <>
                        <ShieldOff className="h-4 w-4 mr-2" />
                        Unban User
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4 mr-2" />
                        Ban User
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportUserDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        userId={userId}
        username={username}
      />

      {isAdmin && (
        <BanUserDialog
          isOpen={showBanDialog}
          onClose={() => setShowBanDialog(false)}
          userId={userId}
          username={username}
          isBanned={userIsBanned}
          onSuccess={() => {
            setUserIsBanned(!userIsBanned);
            onBanStatusChange?.();
          }}
        />
      )}
    </>
  );
};