import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Copy, Flag, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ReportUserDialog } from './ReportUserDialog';

interface ProfileMenuProps {
  userId: string;
  username: string | null;
  isOwnProfile: boolean;
}

export const ProfileMenu = ({ userId, username, isOwnProfile }: ProfileMenuProps) => {
  const { user } = useAuth();
  const [showReportDialog, setShowReportDialog] = useState(false);

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
    </>
  );
};