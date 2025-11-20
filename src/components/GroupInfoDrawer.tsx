import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteGroup } from '@/hooks/useGroupChat';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Trash2,
  Edit2,
  LogOut,
  UserPlus,
  X,
} from 'lucide-react';

interface Member {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

interface GroupInfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  groupName: string;
  groupAvatar?: string | null;
  members: Member[];
  createdBy: string;
  isLoading?: boolean;
}

export function GroupInfoDrawer({
  open,
  onOpenChange,
  conversationId,
  groupName,
  groupAvatar,
  members,
  createdBy,
  isLoading = false,
}: GroupInfoDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: deleteGroup } = useDeleteGroup();

  const [editName, setEditName] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const isAdmin = createdBy === user?.id;

  const handleEditName = async () => {
    if (!editName.trim()) return toast.error('Nama grup tidak boleh kosong');

    try {
      await supabase
        .from('conversations')
        .update({ name: editName })
        .eq('id', conversationId);

      toast.success('Nama grup diperbarui');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setShowEditDialog(false);
      setEditName('');
    } catch (error) {
      toast.error('Gagal mengubah nama grup');
      console.error(error);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberId) return;

    try {
      await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', removeMemberId);

      toast.success('Member dihapus');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setRemoveMemberId(null);
    } catch (error) {
      toast.error('Gagal menghapus member');
      console.error(error);
    }
  };

  const handleExitGroup = async () => {
    if (isAdmin) {
      // Admin delete entire group
      deleteGroup(conversationId, {
        onSuccess: () => {
          toast.success('Grup berhasil dihapus');
          onOpenChange(false);
          navigate('/chat');
        },
        onError: (error: any) => {
          toast.error(`Gagal menghapus grup: ${error.message}`);
        },
      });
    } else {
      // Member just exit
      try {
        await supabase
          .from('conversation_members')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', user?.id);

        toast.success('Anda keluar dari grup');
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        onOpenChange(false);
        navigate('/chat');
      } catch (error) {
        toast.error('Gagal keluar dari grup');
        console.error(error);
      }
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:w-96 flex flex-col">
          <SheetHeader>
            <SheetTitle>Info Grup</SheetTitle>
            <SheetDescription>Detail grup dan anggota</SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-6 pr-4">
              {/* Group Header */}
              <div className="text-center space-y-3">
                <Avatar className="h-24 w-24 mx-auto">
                  <AvatarImage src={groupAvatar || undefined} />
                  <AvatarFallback>
                    <Users className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{groupName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {members.length} anggota
                  </p>
                </div>
              </div>

              {/* Edit Name Button (Admin only) */}
              {isAdmin && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEditName(groupName);
                    setShowEditDialog(true);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Nama Grup
                </Button>
              )}

              {/* Members Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Anggota ({members.length})</h3>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        // TODO: Show add member dialog
                        toast.info('Fitur belum tersedia');
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {isLoading ? (
                    Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <div key={i} className="flex gap-3 p-2">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-2 w-16" />
                          </div>
                        </div>
                      ))
                  ) : (
                    members.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback>
                              {member.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.display_name || member.username}
                            </p>
                            {member.user_id === createdBy && (
                              <p className="text-xs text-muted-foreground">
                                Admin
                              </p>
                            )}
                            {member.user_id === user?.id && (
                              <p className="text-xs text-muted-foreground">
                                Anda
                              </p>
                            )}
                          </div>
                        </div>
                        {isAdmin && member.user_id !== createdBy && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setRemoveMemberId(member.user_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Leave Group Button */}
              {!isAdmin && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowExitDialog(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Keluar dari Grup
                </Button>
              )}

              {isAdmin && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowExitDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus Grup
                </Button>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Edit Name Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Nama Grup</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nama grup baru"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
            >
              Batal
            </Button>
            <Button onClick={handleEditName}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <AlertDialog
        open={!!removeMemberId}
        onOpenChange={() => setRemoveMemberId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Member akan dihapus dari grup ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Group Dialog */}
      <AlertDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAdmin ? 'Hapus Grup?' : 'Keluar dari Grup?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin
                ? 'Grup akan dihapus untuk semua anggota.'
                : 'Anda akan meninggalkan grup ini.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExitGroup}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isAdmin ? 'Hapus' : 'Keluar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
