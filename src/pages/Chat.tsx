import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useCreateConversation, Conversation } from '@/hooks/useConversations';
import { useFavoriteConversations } from '@/hooks/useFavorites';
import { useCreateGroup, useGetGroupMembers, useFollowedUsers, useDeleteGroup } from '@/hooks/useGroupChat';
import { GroupInfoDrawer } from '@/components/GroupInfoDrawer';
import { useMessages, useSendMessage, Message } from '@/hooks/useMessages';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Search,
  Plus,
  Users,
  Star,
  Trash2,
  ArrowLeft,
  Send,
  Paperclip,
  Mic,
  MoreVertical,
  Phone,
  Video,
  X,
  Reply,
  Copy,
  Square,
  MessageCircle,
  Image as ImageIcon,
  FileText,
  Music as MusicIcon,
  Video as VideoIcon,
  Download,
  Share,
  Heart,
  MessageSquare,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, isLoading: loadingConvs } = useConversations();
  const { mutate: createConversation } = useCreateConversation();
  const { mutate: createGroup } = useCreateGroup();
  const { favorites: favConvs, toggleFavorite: toggleFavConv, isFavorite: isConvFav } = useFavoriteConversations();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, username, display_name, avatar_url').neq('user_id', user?.id).limit(100);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: followedUsers = [] } = useFollowedUsers();

  const handleDeleteConversation = async () => {
    if (!deleteConvId) return;
    try {
      await supabase.from('conversation_members').delete().eq('conversation_id', deleteConvId).eq('user_id', user?.id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Percakapan dihapus');
      if (chatId === deleteConvId) navigate('/chat');
      setDeleteConvId(null);
    } catch {
      toast.error('Gagal menghapus');
    }
  };

  const handleContactAdmin = () => {
    if (!user) return toast.error('Tidak login');
    // Buat conversation dengan user baru
    const userId = 'any-user-id'; // Ganti dengan user ID yang dipilih
    createConversation({ otherUserId: userId }, {
      onSuccess: (id) => navigate(`/chat/${id}`),
      onError: () => toast.error('Gagal membuat conversation'),
    });
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length === 0) return toast.error('Isi nama grup dan pilih anggota');
    createGroup({ name: groupName, memberIds: selectedMembers }, {
      onSuccess: (id) => {
        toast.success('Grup berhasil dibuat');
        setShowGroupDialog(false);
        setGroupName('');
        setSelectedMembers([]);
        navigate(`/chat/${id}`);
      },
    });
  };

  const handleStartDirectChat = () => {
    if (!selectedUser) return toast.error('Pilih user');
    createConversation({ otherUserId: selectedUser }, {
      onSuccess: (id) => {
        toast.success('Chat dimulai');
        setShowNewChatDialog(false);
        setSelectedUser(null);
        navigate(`/chat/${id}`);
      },
      onError: () => toast.error('Gagal membuat conversation'),
    });
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.is_group) return conv.name || 'Group Chat';
    const otherMember = conv.members.find((m: any) => m.user_id !== user?.id);
    return otherMember?.display_name || otherMember?.username || 'Unknown';
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.is_group) return conv.avatar_url || null;
    const otherMember = conv.members.find((m: any) => m.user_id !== user?.id);
    return otherMember?.avatar_url;
  };

  const filteredConversations = conversations.filter(c => getConversationName(c).toLowerCase().includes(searchQuery.toLowerCase()));
  const favoriteConversations = filteredConversations.filter(c => isConvFav(c.id));
  const regularConversations = filteredConversations.filter(c => !isConvFav(c.id));

  const renderConversation = (conv: Conversation) => (
    <ContextMenu key={conv.id}>
      <ContextMenuTrigger>
        <div
          onClick={() => navigate(`/chat/${conv.id}`)}
          className={`flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b transition-colors ${chatId === conv.id ? 'bg-accent/50' : ''}`}
        >
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={getConversationAvatar(conv) || undefined} />
              <AvatarFallback>{conv.is_group ? <Users className="h-5 w-5" /> : getConversationName(conv)[0]}</AvatarFallback>
            </Avatar>
            {isConvFav(conv.id) && <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5"><Star className="h-2.5 w-2.5 fill-white text-white" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <h3 className="font-semibold text-sm truncate">{getConversationName(conv)}</h3>
              <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}</span>
            </div>
            <div className="flex items-center gap-2">
              <p className={`text-xs truncate flex-1 ${conv.unread_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {conv.last_message || 'Mulai percakapan'}
              </p>
              {conv.unread_count > 0 && chatId !== conv.id && <Badge className="h-4 min-w-[16px] text-[10px] px-1">{conv.unread_count}</Badge>}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => toggleFavConv.mutate(conv.id)}>
          <Star className="mr-2 h-4 w-4" />
          {isConvFav(conv.id) ? 'Hapus' : 'Tambah'} Favorit
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setDeleteConvId(conv.id)} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Hapus Percakapan
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar chat list - WhatsApp style */}
      <div className={`${chatId ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r flex-col bg-background`}>
        <div className="p-3 border-b">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-bold">Messages</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost"><Plus className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowNewChatDialog(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat Baru
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowGroupDialog(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  Buat Grup
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari atau mulai percakapan" className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 mx-3 mt-2">
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="favorites">Favorit</TabsTrigger>
            <TabsTrigger value="groups">Grup</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="all" className="m-0 mt-2">
              {loadingConvs ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3 border-b">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {favoriteConversations.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-muted/30 sticky top-0"><h3 className="text-xs font-semibold uppercase flex items-center gap-2"><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />Chat Favorit</h3></div>
                      {favoriteConversations.map(renderConversation)}
                    </>
                  )}
                  {regularConversations.map(renderConversation)}
                  {conversations.length === 0 && (
                    <div className="text-center p-8"><MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><p className="text-sm text-muted-foreground">Belum ada percakapan</p></div>
                  )}
                </>
              )}
            </TabsContent>
            <TabsContent value="favorites" className="m-0 mt-2">
              {favoriteConversations.length === 0 ? (
                <div className="text-center p-8"><Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" /><p className="text-sm text-muted-foreground">Belum ada favorit</p></div>
              ) : (
                favoriteConversations.map(renderConversation)
              )}
            </TabsContent>
            <TabsContent value="groups" className="m-0 mt-2">
              {conversations.filter(c => c.is_group).length === 0 ? (
                <div className="text-center p-8"><Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" /><p className="text-sm text-muted-foreground">Belum ada grup</p></div>
              ) : (
                conversations.filter(c => c.is_group).map(renderConversation)
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Chat detail area - WhatsApp style */}
      {chatId ? (
        <ChatDetailArea conversationId={chatId} onBack={() => navigate('/chat')} />
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-muted/20">
          <div className="text-center">
            <MessageCircle className="w-24 h-24 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">Pesan Anda</h2>
            <p className="text-muted-foreground">Pilih percakapan untuk mulai chat</p>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteConvId} onOpenChange={() => setDeleteConvId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Percakapan?</AlertDialogTitle>
            <AlertDialogDescription>Percakapan akan dihapus dari daftar Anda.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Buat Grup Chat</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nama grup" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            {followedUsers.length === 0 ? (
              <div className="text-center p-8 text-sm text-muted-foreground">
                <p>Anda belum follow siapapun</p>
                <p className="text-xs mt-2">Follow user terlebih dahulu untuk membuat grup</p>
              </div>
            ) : (
              <ScrollArea className="h-64 border rounded p-2">
                {followedUsers.map((u: any) => (
                  <div
                    key={u.user_id}
                    onClick={() => setSelectedMembers(p => p.includes(u.user_id) ? p.filter(i => i !== u.user_id) : [...p, u.user_id])}
                    className="flex gap-2 items-center p-2 hover:bg-accent rounded cursor-pointer"
                  >
                    <input type="checkbox" checked={selectedMembers.includes(u.user_id)} readOnly className="pointer-events-none" />
                    <Avatar className="h-8 w-8"><AvatarImage src={u.avatar_url} /><AvatarFallback>{u.username?.[0]}</AvatarFallback></Avatar>
                    <p className="text-sm">{u.display_name || u.username}</p>
                  </div>
                ))}
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDialog(false)}>Batal</Button>
            <Button onClick={handleCreateGroup} disabled={followedUsers.length === 0}>Buat Grup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chat Baru</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Pilih user untuk memulai percakapan</p>
            <ScrollArea className="h-64 border rounded p-2">
              {allUsers.map((u: any) => (
                <div
                  key={u.user_id}
                  onClick={() => {
                    setSelectedUser(u.user_id);
                    handleStartDirectChat();
                  }}
                  className="flex gap-2 items-center p-2 hover:bg-accent rounded cursor-pointer"
                >
                  <Avatar className="h-10 w-10"><AvatarImage src={u.avatar_url} /><AvatarFallback>{u.username?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.display_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>Batal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== ChatDetailArea Component ====================
interface ChatDetailAreaProps {
  conversationId: string;
  onBack: () => void;
}

function ChatDetailArea({ conversationId, onBack }: ChatDetailAreaProps) {
  const { user } = useAuth();
  const { messages, isLoading } = useMessages(conversationId);
  const { conversations } = useConversations();
  const { mutate: sendMessage } = useSendMessage();
  const { data: groupMembers = [] } = useGetGroupMembers(conversationId);
  const queryClient = useQueryClient();

  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [attachmentViewer, setAttachmentViewer] = useState<{ isOpen: boolean; url: string | null; type: string | null }>({ isOpen: false, url: null, type: null });
  const [deleteMessageInfo, setDeleteMessageInfo] = useState<Message | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentConversation = conversations.find(c => c.id === conversationId);
  const otherUser = currentConversation?.members.find(m => m.user_id !== user?.id);
  const conversationName = currentConversation?.is_group ? currentConversation.name || 'Group Chat' : otherUser?.display_name || otherUser?.username || 'Unknown';
  const conversationAvatar = currentConversation?.is_group ? currentConversation.avatar_url : otherUser?.avatar_url;
  
  // Check apakah user masih member grup
  const isUserMember = currentConversation?.members?.some(m => m.user_id === user?.id);
  const isGroupChat = currentConversation?.is_group;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check if user was removed from group and show toast notification
  useEffect(() => {
    if (isGroupChat && !isUserMember) {
      toast.error('Anda telah dikeluarkan dari grup');
    }
  }, [isUserMember, isGroupChat]);

  const handleSend = () => {
    if ((!newMessage.trim() && !selectedFile && !audioBlob) || !conversationId) return;
    const fileToSend = audioBlob ? new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' }) : selectedFile;
    sendMessage({
      conversationId,
      content: newMessage.trim(),
      file: fileToSend || undefined,
      parentMessageId: replyingTo?.id,
    });
    setNewMessage('');
    setSelectedFile(null);
    setAudioBlob(null);
    setReplyingTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) return toast.error('File max 10MB');
      setSelectedFile(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        setAudioBlob(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error('Tidak dapat akses mikrofon');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleConfirmDeleteMessage = async () => {
    if (!deleteMessageInfo) return;
    try {
      await supabase.from('messages').delete().eq('id', deleteMessageInfo.id);
      toast.success('Pesan dihapus');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    } catch {
      toast.error('Gagal hapus pesan');
    } finally {
      setDeleteMessageInfo(null);
    }
  };

  const getAttachmentUrl = (path?: string) => {
    if (!path) return null;
    const { data } = supabase.storage.from('chat-attachments').getPublicUrl(path);
    return data.publicUrl;
  };

  const getFileIcon = (type?: string) => {
    if (!type) return <FileText className="h-4 w-4" />;
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <MusicIcon className="h-4 w-4" />;
    if (type.startsWith('video/')) return <VideoIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const ReplyPreview = ({ message }: { message: Message }) => (
    <div className="bg-black/10 dark:bg-white/10 p-2 rounded mb-2 border-l-4 border-primary/50 text-xs">
      <div className="font-semibold text-primary">Balas {message.sender.display_name || message.sender.username}</div>
      <p className="text-muted-foreground line-clamp-1 mt-1">{message.content}</p>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 bg-background">
      {/* Header */}
      <div className="border-b p-3 flex items-center justify-between bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-1">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </>
          ) : (
            <>
              <Avatar className="h-10 w-10">
                <AvatarImage src={conversationAvatar || undefined} />
                <AvatarFallback>{currentConversation?.is_group ? <Users className="h-5 w-5" /> : conversationName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => currentConversation?.is_group && setShowGroupInfo(true)}>
                <h3 className="font-semibold text-sm truncate">{conversationName}</h3>
                {currentConversation?.is_group && (
                  <p className="text-xs text-muted-foreground">{currentConversation.members.length} anggota</p>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon"><Phone className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon"><Video className="h-5 w-5" /></Button>
          {currentConversation?.is_group && (
            <Button variant="ghost" size="icon" onClick={() => setShowGroupInfo(true)}><MoreVertical className="h-5 w-5" /></Button>
          )}
          {!currentConversation?.is_group && (
            <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className={`flex gap-2 mb-4 ${i % 2 === 0 ? '' : 'justify-end'}`}>
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-16 w-64 rounded-lg" />
            </div>
          ))
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            const attachmentUrl = getAttachmentUrl(msg.attachment_url);
            return (
              <ContextMenu key={msg.id}>
                <ContextMenuTrigger>
                  <div className={`flex gap-2 mb-3 ${isOwn ? 'justify-end' : ''}`}>
                    {!isOwn && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={msg.sender.avatar_url} />
                        <AvatarFallback>{msg.sender.username?.[0]}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[70%] ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
                      {msg.parent_message && (
                        <div className="text-xs opacity-70 border-l-2 border-current pl-2 mb-2">
                          <div className="font-semibold">{msg.parent_message.sender?.display_name || 'User'}</div>
                          <div className="line-clamp-1">{msg.parent_message.content}</div>
                        </div>
                      )}
                      {msg.content && <p className="text-sm break-words">{msg.content}</p>}
                      {attachmentUrl && (
                        <div className="mt-2">
                          {msg.attachment_type?.startsWith('image/') ? (
                            <img src={attachmentUrl} alt="Attachment" className="rounded max-h-64 cursor-pointer" onClick={() => setAttachmentViewer({ isOpen: true, url: attachmentUrl, type: msg.attachment_type || null })} />
                          ) : msg.attachment_type?.startsWith('video/') ? (
                            <video src={attachmentUrl} controls className="rounded max-h-64" />
                          ) : msg.attachment_type?.startsWith('audio/') ? (
                            <audio src={attachmentUrl} controls className="w-full" />
                          ) : (
                            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs underline">
                              {getFileIcon(msg.attachment_type)}
                              Lihat file
                            </a>
                          )}
                        </div>
                      )}
                      <div className="text-[10px] mt-1 opacity-70">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</div>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => setReplyingTo(msg)}><Reply className="mr-2 h-4 w-4" />Balas</ContextMenuItem>
                  <ContextMenuItem onClick={() => { navigator.clipboard.writeText(msg.content); toast.success('Disalin'); }}><Copy className="mr-2 h-4 w-4" />Salin</ContextMenuItem>
                  <ContextMenuSeparator />
                  {isOwn && <ContextMenuItem onClick={() => setDeleteMessageInfo(msg)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Hapus</ContextMenuItem>}
                </ContextMenuContent>
              </ContextMenu>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-3 bg-background">
        {!isUserMember && isGroupChat && (
          <div className="mb-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>Anda bukan anggota grup. Tidak dapat mengirim pesan.</p>
          </div>
        )}
        {replyingTo && (
          <div className="mb-2 flex items-center justify-between bg-muted p-2 rounded">
            <ReplyPreview message={replyingTo} />
            <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)}><X className="h-4 w-4" /></Button>
          </div>
        )}
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2 bg-muted p-2 rounded">
            {getFileIcon(selectedFile.type)}
            <span className="text-xs flex-1 truncate">{selectedFile.name}</span>
            <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)}><X className="h-4 w-4" /></Button>
          </div>
        )}
        {audioBlob && (
          <div className="mb-2 flex items-center gap-2 bg-muted p-2 rounded">
            <MusicIcon className="h-4 w-4" />
            <span className="text-xs">Rekaman audio</span>
            <Button variant="ghost" size="icon" onClick={() => setAudioBlob(null)}><X className="h-4 w-4" /></Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} disabled={!isUserMember && isGroupChat} />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={!isUserMember && isGroupChat}><Paperclip className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording} disabled={!isUserMember && isGroupChat}>
            {isRecording ? <Square className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Input 
            placeholder={isUserMember || !isGroupChat ? "Ketik pesan..." : "Anda bukan anggota grup"} 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            onKeyPress={handleKeyPress} 
            className="flex-1" 
            disabled={!isUserMember && isGroupChat}
          />
          <Button onClick={handleSend} size="icon" disabled={!isUserMember && isGroupChat}><Send className="h-5 w-5" /></Button>
        </div>
      </div>

      <AlertDialog open={!!deleteMessageInfo} onOpenChange={() => setDeleteMessageInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pesan?</AlertDialogTitle>
            <AlertDialogDescription>Pesan akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteMessage}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={attachmentViewer.isOpen} onOpenChange={() => setAttachmentViewer({ isOpen: false, url: null, type: null })}>
        <DialogContent className="max-w-3xl p-0 bg-black border-0">
          <div className="relative aspect-video flex items-center justify-center">
            <img src={attachmentViewer.url || ''} alt="Attachment" className="max-h-[70vh] w-auto object-contain" />
          </div>
          <DialogFooter className="bg-background/80 backdrop-blur-sm p-2 flex justify-between w-full">
            <div className="flex gap-1">
              <Button variant="ghost" size="icon"><Heart className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon"><Share className="h-5 w-5" /></Button>
            </div>
            <a href={attachmentViewer.url || ''} download target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon"><Download className="h-5 w-5" /></Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {currentConversation?.is_group && (
        <GroupInfoDrawer
          open={showGroupInfo}
          onOpenChange={setShowGroupInfo}
          conversationId={conversationId}
          groupName={conversationName}
          groupAvatar={conversationAvatar}
          members={groupMembers?.map?.((m: any) => m.profiles || m) || currentConversation.members || []}
          createdBy={currentConversation.created_by || ''}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
