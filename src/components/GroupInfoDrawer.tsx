import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteGroup } from '@/hooks/useGroupChat';
import { useGroupRoles, GroupRole } from '@/hooks/useGroupRoles';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Users,
  Trash2,
  Edit2,
  LogOut,
  UserPlus,
  Shield,
  ShieldCheck,
  Crown,
  Lock,
  Share2,
  Camera,
  MoreVertical,
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
  chatMode?: string;
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
  chatMode = 'open',
}: GroupInfoDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: deleteGroup } = useDeleteGroup();
  const { getUserRole, setRole, updateChatMode } = useGroupRoles(conversationId);

  const [editName, setEditName] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const isCreator = createdBy === user?.id;
  const myRole = user ? getUserRole(user.id) : 'member';
  const isAdmin = isCreator || myRole === 'admin';
  const isModerator = myRole === 'moderator';
  const canManageMembers = isAdmin;

  // Sort members: creator first, then admins, moderators, members
  const sortedMembers = [...members].sort((a, b) => {
    if (a.user_id === createdBy) return -1;
    if (b.user_id === createdBy) return 1;
    const roleOrder: Record<string, number> = { admin: 0, moderator: 1, member: 2 };
    return (roleOrder[getUserRole(a.user_id)] || 2) - (roleOrder[getUserRole(b.user_id)] || 2);
  });

  const getRoleBadge = (userId: string) => {
    if (userId === createdBy) return <Badge variant="default" className="text-[10px] px-1.5 py-0"><Crown className="h-2.5 w-2.5 mr-0.5" />Owner</Badge>;
    const role = getUserRole(userId);
    if (role === 'admin') return <Badge variant="secondary" className="text-[10px] px-1.5 py-0"><ShieldCheck className="h-2.5 w-2.5 mr-0.5" />Admin</Badge>;
    if (role === 'moderator') return <Badge variant="outline" className="text-[10px] px-1.5 py-0"><Shield className="h-2.5 w-2.5 mr-0.5" />Mod</Badge>;
    return null;
  };

  const handleEditName = async () => {
    if (!editName.trim()) return toast.error('Nama grup tidak boleh kosong');
    try {
      await supabase.from('conversations').update({ name: editName }).eq('id', conversationId);
      toast.success('Nama grup diperbarui');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setShowEditDialog(false);
      setEditName('');
    } catch {
      toast.error('Gagal mengubah nama grup');
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberId) return;
    try {
      await supabase.from('conversation_members').delete().eq('conversation_id', conversationId).eq('user_id', removeMemberId);
      // Also remove group role
      await supabase.from('group_roles').delete().eq('conversation_id', conversationId).eq('user_id', removeMemberId);
      toast.success('Member dihapus');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['group-roles', conversationId] });
      setRemoveMemberId(null);
    } catch {
      toast.error('Gagal menghapus member');
    }
  };

  const handleChangeRole = async (userId: string, newRole: GroupRole) => {
    setRole.mutate({ userId, role: newRole });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5MB');

    try {
      const ext = file.name.split('.').pop();
      const path = `groups/${conversationId}/avatar-${Date.now()}.${ext}`;
      await supabase.storage.from('chat-attachments').upload(path, file, { upsert: true });
      
      const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(path);
      await supabase.from('conversations').update({ avatar_url: urlData.publicUrl }).eq('id', conversationId);
      
      toast.success('Avatar grup diperbarui');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch {
      toast.error('Gagal upload avatar');
    }
  };

  const handleShareGroup = async () => {
    const shareUrl = `${window.location.origin}/chat/${conversationId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link grup disalin ke clipboard!');
    } catch {
      toast.info(`Link: ${shareUrl}`);
    }
  };

  const handleExitGroup = async () => {
    if (isCreator) {
      deleteGroup(conversationId, {
        onSuccess: () => { onOpenChange(false); navigate('/chat'); },
        onError: (err: any) => toast.error(`Gagal: ${err.message}`),
      });
    } else {
      try {
        await supabase.from('conversation_members').delete().eq('conversation_id', conversationId).eq('user_id', user?.id);
        await supabase.from('group_roles').delete().eq('conversation_id', conversationId).eq('user_id', user?.id);
        toast.success('Anda keluar dari grup');
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        onOpenChange(false);
        navigate('/chat');
      } catch {
        toast.error('Gagal keluar');
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
              {/* Group Header with avatar upload */}
              <div className="text-center space-y-3">
                <div className="relative inline-block">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src={groupAvatar || undefined} />
                    <AvatarFallback><Users className="h-12 w-12" /></AvatarFallback>
                  </Avatar>
                  {isAdmin && (
                    <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:opacity-80">
                      <Camera className="h-3.5 w-3.5" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{groupName}</h2>
                  <p className="text-sm text-muted-foreground">{members.length} anggota</p>
                </div>
              </div>

              {/* E2E Badge */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                <Lock className="h-4 w-4 text-primary" />
                <span>Pesan terenkripsi end-to-end 🔒</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {isAdmin && (
                  <Button variant="outline" className="flex-1" onClick={() => { setEditName(groupName); setShowEditDialog(true); }}>
                    <Edit2 className="h-4 w-4 mr-2" />Edit Nama
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={handleShareGroup}>
                  <Share2 className="h-4 w-4 mr-2" />Bagikan
                </Button>
              </div>

              {/* Chat Mode (Admin only) */}
              {isAdmin && (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Mode Terbatas</p>
                    <p className="text-xs text-muted-foreground">Hanya Admin & Mod yang bisa chat</p>
                  </div>
                  <Switch
                    checked={chatMode === 'restricted'}
                    onCheckedChange={(checked) => updateChatMode.mutate(checked ? 'restricted' : 'open')}
                  />
                </div>
              )}

              {/* Members Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Anggota ({members.length})</h3>
                  {canManageMembers && (
                    <Button size="sm" variant="ghost" onClick={() => toast.info('Fitur tambah anggota')}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-1">
                  {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="flex gap-3 p-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-2 w-16" />
                        </div>
                      </div>
                    ))
                  ) : (
                    sortedMembers.map((member) => (
                      <div key={member.user_id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback>{member.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{member.display_name || member.username}</p>
                              {getRoleBadge(member.user_id)}
                            </div>
                            {member.user_id === user?.id && <p className="text-xs text-muted-foreground">Anda</p>}
                          </div>
                        </div>
                        
                        {/* Role management dropdown (admin only, can't change creator) */}
                        {isAdmin && member.user_id !== createdBy && member.user_id !== user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, 'admin')}>
                                <ShieldCheck className="h-4 w-4 mr-2" />Jadikan Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, 'moderator')}>
                                <Shield className="h-4 w-4 mr-2" />Jadikan Moderator
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, 'member')}>
                                <Users className="h-4 w-4 mr-2" />Jadikan Member
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setRemoveMemberId(member.user_id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />Keluarkan
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Leave/Delete Group */}
              <Button variant="destructive" className="w-full" onClick={() => setShowExitDialog(true)}>
                {isCreator ? <><Trash2 className="h-4 w-4 mr-2" />Hapus Grup</> : <><LogOut className="h-4 w-4 mr-2" />Keluar dari Grup</>}
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Edit Name Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Nama Grup</DialogTitle></DialogHeader>
          <Input placeholder="Nama grup baru" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
            <Button onClick={handleEditName}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={!!removeMemberId} onOpenChange={() => setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Member?</AlertDialogTitle>
            <AlertDialogDescription>Member akan dihapus dari grup ini.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Group Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isCreator ? 'Hapus Grup?' : 'Keluar dari Grup?'}</AlertDialogTitle>
            <AlertDialogDescription>{isCreator ? 'Grup akan dihapus untuk semua anggota.' : 'Anda akan meninggalkan grup ini.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleExitGroup} className="bg-destructive hover:bg-destructive/90">{isCreator ? 'Hapus' : 'Keluar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
