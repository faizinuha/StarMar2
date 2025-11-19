import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversations, useCreateConversation } from '@/hooks/useConversations';
import { useFavoriteConversations } from '@/hooks/useFavorites';
import { useCreateGroup } from '@/hooks/useGroupChat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Users, Search, Shield, Trash2, CheckCheck, Plus, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Chat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, isLoading } = useConversations();
  const { mutate: createConversation } = useCreateConversation();
  const { mutate: createGroup } = useCreateGroup();
  const { favorites: favConversations, toggleFavorite: toggleFavConv, isFavorite: isConvFavorite } = useFavoriteConversations();
  const queryClient = useQueryClient();
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const { data: adminUser } = useQuery({
    queryKey: ['admin-user'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, username, display_name, avatar_url').eq('role', 'admin').limit(1).single();
      return data;
    },
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, username, display_name, avatar_url').neq('user_id', user?.id).limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  const getConversationName = (conv: any) => {
    if (conv.is_group) return conv.name || 'Group Chat';
    const otherMember = conv.members.find((m: any) => m.user_id !== user?.id);
    return otherMember?.display_name || otherMember?.username || 'Unknown';
  };

  const getConversationAvatar = (conv: any) => {
    if (conv.is_group) return null;
    const otherMember = conv.members.find((m: any) => m.user_id !== user?.id);
    return otherMember?.avatar_url;
  };

  const handleContactAdmin = () => {
    if (!adminUser) return toast.error('Admin tidak ditemukan');
    createConversation({ otherUserId: adminUser.user_id }, {
      onSuccess: (conversationId) => navigate(`/chat/${conversationId}`),
      onError: () => toast.error('Gagal membuat conversation'),
    });
  };

  const handleDeleteConversation = async () => {
    if (!deleteConvId) return;
    try {
      await supabase.from('conversation_members').delete().eq('conversation_id', deleteConvId).eq('user_id', user?.id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversation dihapus');
      setDeleteConvId(null);
    } catch {
      toast.error('Gagal menghapus');
    }
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length === 0) return toast.error('Isi nama grup dan pilih anggota');
    createGroup({ name: groupName, memberIds: selectedMembers }, {
      onSuccess: (id) => {
        toast.success('Grup berhasil dibuat');
        setShowGroupDialog(false);
        navigate(`/chat/${id}`);
      },
    });
  };

  const filteredConversations = conversations.filter(c => getConversationName(c).toLowerCase().includes(searchQuery.toLowerCase()));
  const favoriteConversations = filteredConversations.filter(c => isConvFavorite(c.id));
  const regularConversations = filteredConversations.filter(c => !isConvFavorite(c.id));

  const renderConversation = (conv: any) => (
    <ContextMenu key={conv.id}>
      <ContextMenuTrigger>
        <div onClick={() => navigate(`/chat/${conv.id}`)} className="flex items-center gap-3 p-4 hover:bg-accent cursor-pointer border-b">
          <div className="relative">
            <Avatar className="h-14 w-14">
              <AvatarImage src={getConversationAvatar(conv) || undefined} />
              <AvatarFallback>{conv.is_group ? <Users className="h-6 w-6" /> : getConversationName(conv)[0]}</AvatarFallback>
            </Avatar>
            {isConvFavorite(conv.id) && <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1"><Star className="h-3 w-3 fill-white" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-1">
              <h3 className="font-semibold text-sm truncate">{getConversationName(conv)}</h3>
              <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(conv.last_message_at))}</span>
            </div>
            <div className="flex items-center gap-2">
              <p className={`text-sm truncate flex-1 ${conv.unread_count > 0 ? 'font-semibold' : 'text-muted-foreground'}`}>{conv.last_message || 'Start conversation'}</p>
              {conv.unread_count > 0 && <Badge className="h-5 min-w-[20px]">{conv.unread_count}</Badge>}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => toggleFavConv.mutate(conv.id)}><Star className="mr-2 h-4 w-4" />{isConvFavorite(conv.id) ? 'Hapus' : 'Tambah'} Favorit</ContextMenuItem>
        <ContextMenuItem onClick={() => setDeleteConvId(conv.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Hapus</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  return (
    <div className="flex h-screen w-full">
      <div className="w-full md:w-96 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between mb-4">
            <h1 className="text-2xl font-bold">Messages</h1>
            <Button onClick={() => setShowGroupDialog(true)} size="icon" variant="ghost"><Plus className="h-5 w-5" /></Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 px-4 pt-2">
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="favorites">Favorit</TabsTrigger>
            <TabsTrigger value="groups">Grup</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="all" className="m-0">
              {isLoading ? [...Array(5)].map((_, i) => <div key={i} className="flex gap-3 p-4"><Skeleton className="h-14 w-14 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div></div>) : (
                <>
                  {adminUser && <div onClick={handleContactAdmin} className="flex items-center gap-3 p-4 hover:bg-accent cursor-pointer border-b"><Avatar className="h-14 w-14"><AvatarFallback><Shield className="h-6 w-6" /></AvatarFallback></Avatar><div><h3 className="font-semibold text-sm">Admin Support</h3><p className="text-xs text-muted-foreground">Hubungi admin</p></div></div>}
                  {favoriteConversations.length > 0 && <><div className="px-4 py-2 bg-muted/30"><h3 className="text-xs font-semibold uppercase flex items-center gap-2"><Star className="h-3 w-3 fill-yellow-500" />Favorit</h3></div>{favoriteConversations.map(renderConversation)}</>}
                  {regularConversations.map(renderConversation)}
                  {conversations.length === 0 && <div className="text-center p-8"><MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><p>No conversations</p></div>}
                </>
              )}
            </TabsContent>
            <TabsContent value="favorites">{favoriteConversations.map(renderConversation)}</TabsContent>
            <TabsContent value="groups">{conversations.filter(c => c.is_group).map(renderConversation)}</TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      <div className="hidden md:flex flex-1 items-center justify-center"><div className="text-center"><MessageCircle className="w-24 h-24 mx-auto mb-4 text-muted-foreground" /><h2 className="text-xl font-semibold">Your Messages</h2><p className="text-muted-foreground">Select a conversation</p></div></div>

      <AlertDialog open={!!deleteConvId} onOpenChange={() => setDeleteConvId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus Conversation?</AlertDialogTitle><AlertDialogDescription>Conversation akan dihapus dari daftar Anda.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConversation}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent><DialogHeader><DialogTitle>Buat Grup Chat</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Nama grup" value={groupName} onChange={(e) => setGroupName(e.target.value)} /><ScrollArea className="h-64 border rounded p-2">{allUsers.map((u: any) => <div key={u.user_id} onClick={() => setSelectedMembers(p => p.includes(u.user_id) ? p.filter(i => i !== u.user_id) : [...p, u.user_id])} className="flex gap-2 p-2 hover:bg-accent rounded cursor-pointer"><input type="checkbox" checked={selectedMembers.includes(u.user_id)} readOnly /><Avatar className="h-8 w-8"><AvatarImage src={u.avatar_url} /><AvatarFallback>{u.username?.[0]}</AvatarFallback></Avatar><p className="text-sm">{u.display_name || u.username}</p></div>)}</ScrollArea></div><DialogFooter><Button variant="outline" onClick={() => setShowGroupDialog(false)}>Batal</Button><Button onClick={handleCreateGroup}>Buat Grup</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
