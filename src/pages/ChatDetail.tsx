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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { Message, useMessages, useSendMessage } from '@/hooks/useMessages';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Copy,
  Download,
  FileText,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Mic,
  MoreVertical,
  Music,
  Paperclip,
  Phone,
  Play,
  Reply,
  Send,
  Share,
  Square,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import { MouseEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const AttachmentViewerModal = ({ attachment, isOpen, onClose }) => {
  if (!attachment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 bg-black border-0">
        <div className="relative aspect-video flex items-center justify-center">
          <img
            src={attachment.url}
            alt="Attachment"
            className="max-h-[70vh] w-auto object-contain"
          />
        </div>
        <DialogFooter className="bg-background/80 backdrop-blur-sm p-2 flex justify-between w-full">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Reply className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon">
              <Share className="h-5 w-5" />
            </Button>
            <a
              href={attachment.url}
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="icon">
                <Download className="h-5 w-5" />
              </Button>
            </a>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function ChatDetail() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, isLoading } = useMessages(chatId);
  const { conversations } = useConversations();
  const { mutate: sendMessage } = useSendMessage();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [attachmentViewer, setAttachmentViewer] = useState<{
    isOpen: boolean;
    url: string | null;
    type: string | null;
  }>({ isOpen: false, url: null, type: null });
  const [deleteAttachmentInfo, setDeleteAttachmentInfo] = useState<{
    messageId: string;
    path: string;
  } | null>(null);
  const [deleteMessageInfo, setDeleteMessageInfo] = useState<Message | null>(
    null
  );
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if ((!newMessage.trim() && !selectedFile && !audioBlob) || !chatId) return;

    const fileToSend = audioBlob
      ? new File([audioBlob], `audio-${Date.now()}.webm`, {
          type: 'audio/webm',
        })
      : selectedFile;

    sendMessage({
      conversationId: chatId,
      content: newMessage.trim(),
      file: fileToSend || undefined,
      parent_message_id: replyingTo?.id,
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
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('Tidak dapat mengakses mikrofon');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const getFileIcon = (type?: string) => {
    if (!type) return <FileText className="h-4 w-4" />;
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const handleConfirmDeleteAttachment = async () => {
    if (!deleteAttachmentInfo) return;

    const { messageId, path } = deleteAttachmentInfo;

    try {
      // 1. Hapus file dari storage
      const { error: storageError } = await supabase.storage
        .from('chat-attachments')
        .remove([path]);

      if (storageError) throw storageError;

      // 2. Update pesan di database untuk menghapus attachment
      const { error: dbError } = await supabase
        .from('messages')
        .update({ attachment_url: null, attachment_type: null })
        .eq('id', messageId);

      if (dbError) throw dbError;

      toast.success('Lampiran berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    } catch (error: any) {
      console.error('Error deleting attachment:', error);
      toast.error('Gagal menghapus lampiran: ' + error.message);
    } finally {
      setDeleteAttachmentInfo(null);
    }
  };

  const handleConfirmDeleteMessage = async () => {
    if (!deleteMessageInfo) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', deleteMessageInfo.id);

      if (error) throw error;

      toast.success('Pesan berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    } catch (error: any) {
      toast.error('Gagal menghapus pesan: ' + error.message);
    } finally {
      setDeleteMessageInfo(null);
    }
  };

  const currentConversation = conversations.find((c) => c.id === chatId);
  const otherUser = currentConversation?.members.find(
    (m) => m.user_id !== user?.id
  );

  const ReplyPreview = ({ message }: { message: Message }) => (
    <div className="bg-black/10 dark:bg-white/10 p-2 rounded-lg mb-2 border-l-4 border-primary/50 text-xs">
      <div className="font-semibold text-primary">
        Replying to {message.sender.display_name || message.sender.username}
      </div>
      <p className="text-muted-foreground line-clamp-1 mt-1">
        {message.content}
      </p>
    </div>
  );

  const handleReplyClick = (e: MouseEvent, message: Message) => {
    e.stopPropagation();
    setReplyingTo(message);
  };

  const handleCopyText = (e: MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success('Teks disalin ke clipboard');
    // Optional: focus the input
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Chat List Sidebar - Desktop only */}
      <div className="hidden md:flex w-96 border-r flex-col bg-background">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No conversations</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => navigate(`/chat/${conversation.id}`)}
                className={`flex items-center gap-3 p-4 hover:bg-accent cursor-pointer transition-colors border-b ${
                  conversation.id === chatId ? 'bg-accent' : ''
                }`}
              >
                <Avatar className="h-12 w-12 border-2 border-border">
                  <AvatarImage src={conversation.members.find(m => m.user_id !== user?.id)?.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted">
                    {conversation.is_group ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      (
                        conversation.members.find(m => m.user_id !== user?.id)
                          ?.display_name ||
                        conversation.members.find(m => m.user_id !== user?.id)?.username
                      )?.[0]?.toUpperCase()
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold truncate text-sm">
                      {conversation.is_group
                        ? conversation.name || 'Group Chat'
                        : conversation.members.find(m => m.user_id !== user?.id)?.display_name ||
                          conversation.members.find(m => m.user_id !== user?.id)?.username || 'Unknown'}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(
                        new Date(conversation.last_message_at),
                        {
                          addSuffix: false,
                        }
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs truncate flex-1 text-muted-foreground">
                      {conversation.last_message || 'Start conversation'}
                    </p>
                    {conversation.unread_count > 0 &&
                      conversation.id !== chatId && (
                        <Badge
                          variant="default"
                          className="h-4 min-w-[16px] flex items-center justify-center px-1 text-xs rounded-full"
                        >
                          {conversation.unread_count}
                        </Badge>
                      )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Detail Area */}
      <div className="flex flex-col flex-1 bg-background">
        {/* Header - Instagram Style */}
        <div className="border-b p-3 flex items-center justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/chat')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {isLoading ? (
              <>
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : (
              <>
                <Avatar className="h-10 w-10 border-2 border-border">
                  <AvatarImage src={otherUser?.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted">
                    {otherUser?.display_name?.[0]?.toUpperCase() || otherUser?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="font-semibold text-sm">
                    {otherUser?.display_name || otherUser?.username || 'Chat'}
                  </h1>
                  <p className="text-xs text-muted-foreground">Active now</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Welcome Message */}
          {!isLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="max-w-md space-y-2">
                <h3 className="text-lg font-semibold">
                  Selamat datang di chat {otherUser?.display_name || otherUser?.username || 'user'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Chat ini terenkripsi end-to-end, jadi aman! 🔒
                </p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 ${
                    i % 2 === 0 ? '' : 'flex-row-reverse'
                  }`}
                >
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div
                    className={`space-y-2 ${i % 2 === 0 ? '' : 'items-end'}`}
                  >
                    <Skeleton
                      className={`h-16 ${
                        i % 2 === 0 ? 'w-64' : 'w-48'
                      } rounded-2xl`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex items-end gap-2 ${
                    isOwnMessage ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={message.sender.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {message.sender.display_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <ContextMenu>
                    <ContextMenuTrigger
                      className={`flex flex-col max-w-[70%] ${
                        isOwnMessage ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`rounded-3xl px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        }`}
                      >
                        {message.parent_message && (
                          <ReplyPreview message={message.parent_message} />
                        )}
                        {message.attachment_url && (
                          <div className="mb-2">
                            {message.attachment_type?.startsWith('image/') ? (
                              <ContextMenu>
                                <ContextMenuTrigger>
                                  <img
                                    src={
                                      supabase.storage
                                        .from('chat-attachments')
                                        .getPublicUrl(message.attachment_url)
                                        .data.publicUrl
                                    }
                                    alt="Attachment"
                                    className="max-w-full rounded-lg max-h-60 object-cover cursor-pointer"
                                    onClick={() => {
                                      const url = supabase.storage
                                        .from('chat-attachments')
                                        .getPublicUrl(message.attachment_url!)
                                        .data.publicUrl;
                                      setAttachmentViewer({
                                        isOpen: true,
                                        url,
                                        type: message.attachment_type,
                                      });
                                    }}
                                  />
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem>
                                    <Heart className="mr-2 h-4 w-4" /> Favorit
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    onClick={(e) =>
                                      handleReplyClick(e, message)
                                    }
                                  >
                                    <Reply className="mr-2 h-4 w-4" /> Balas
                                  </ContextMenuItem>
                                  <ContextMenuItem>
                                    <Share className="mr-2 h-4 w-4" /> Teruskan
                                  </ContextMenuItem>
                                  <ContextMenuItem asChild>
                                    <a
                                      href={
                                        supabase.storage
                                          .from('chat-attachments')
                                          .getPublicUrl(message.attachment_url)
                                          .data.publicUrl
                                      }
                                      download
                                    >
                                      <Download className="mr-2 h-4 w-4" />{' '}
                                      Unduh
                                    </a>
                                  </ContextMenuItem>
                                  {isOwnMessage && (
                                    <>
                                      <ContextMenuSeparator />
                                      <ContextMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() =>
                                          setDeleteAttachmentInfo({
                                            messageId: message.id,
                                            path: message.attachment_url!,
                                          })
                                        }
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />{' '}
                                        Hapus Gambar
                                      </ContextMenuItem>
                                    </>
                                  )}
                                </ContextMenuContent>
                              </ContextMenu>
                            ) : message.attachment_type?.startsWith(
                                'video/'
                              ) ? (
                              <video
                                controls
                                className="max-w-full rounded-lg max-h-60"
                                src={
                                  supabase.storage
                                    .from('chat-attachments')
                                    .getPublicUrl(message.attachment_url).data
                                    .publicUrl
                                }
                              />
                            ) : message.attachment_type?.startsWith(
                                'audio/'
                              ) ? (
                              <audio controls className="max-w-full">
                                <source
                                  src={
                                    supabase.storage
                                      .from('chat-attachments')
                                      .getPublicUrl(message.attachment_url)
                                      .data.publicUrl
                                  }
                                  type={message.attachment_type}
                                />
                              </audio>
                            ) : (
                              <a
                                href={
                                  supabase.storage
                                    .from('chat-attachments')
                                    .getPublicUrl(message.attachment_url).data
                                    .publicUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm hover:underline"
                              >
                                {getFileIcon(message.attachment_type)}
                                <span>Lihat lampiran</span>
                              </a>
                            )}
                          </div>
                        )}
                        {message.content && (
                          <p className="text-sm break-words leading-relaxed">
                            {message.content}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 px-2">
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: false,
                        })}
                      </span>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={(e) => handleReplyClick(e, message)}
                      >
                        <Reply className="mr-2 h-4 w-4" /> Balas
                      </ContextMenuItem>
                      {message.content && (
                        <ContextMenuItem
                          onClick={(e) => handleCopyText(e, message.content!)}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Salin Teks
                        </ContextMenuItem>
                      )}
                      <ContextMenuItem>
                        <Share className="mr-2 h-4 w-4" /> Teruskan
                      </ContextMenuItem>
                      {isOwnMessage && (
                        <>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteMessageInfo(message)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus Pesan
                          </ContextMenuItem>
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <AttachmentViewerModal
          attachment={attachmentViewer}
          isOpen={attachmentViewer.isOpen}
          onClose={() =>
            setAttachmentViewer({ isOpen: false, url: null, type: null })
          }
        />

        <AlertDialog
          open={!!deleteAttachmentInfo}
          onOpenChange={() => setDeleteAttachmentInfo(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Lampiran?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini tidak dapat dibatalkan. Lampiran akan dihapus
                secara permanen dari server.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteAttachment}>
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!deleteMessageInfo}
          onOpenChange={() => setDeleteMessageInfo(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Pesan?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini tidak dapat dibatalkan. Pesan ini akan dihapus
                secara permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteMessage}>
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Input - Instagram Style */}
        <div className="border-t p-3 bg-background">
          {replyingTo && (
            <div className="mb-2 max-w-4xl mx-auto bg-muted/50 p-2 rounded-lg relative">
              <div className="text-xs font-semibold text-primary">
                Replying to {replyingTo.sender.display_name}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {replyingTo.content}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={() => setReplyingTo(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {(selectedFile || audioBlob) && (
            <div className="mb-2 max-w-4xl mx-auto">
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                {audioBlob ? (
                  <>
                    <Music className="h-4 w-4" />
                    <span className="text-sm flex-1">Rekaman suara</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const url = URL.createObjectURL(audioBlob);
                        const audio = new Audio(url);
                        audio.play();
                      }}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    {getFileIcon(selectedFile?.type)}
                    <span className="text-sm flex-1 truncate">
                      {selectedFile?.name}
                    </span>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => {
                    setSelectedFile(null);
                    setAudioBlob(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <div className="flex gap-2 items-center max-w-4xl mx-auto">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRecording}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {!selectedFile && !audioBlob && (
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full h-10 w-10 ${
                  isRecording
                    ? 'bg-destructive text-destructive-foreground'
                    : ''
                }`}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
              >
                {isRecording ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}

            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ketik pesan..."
              className="flex-1 rounded-full border-2 px-4 py-2 bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isRecording}
            />
            <Button
              onClick={handleSend}
              disabled={
                (!newMessage.trim() && !selectedFile && !audioBlob) ||
                isRecording
              }
              size="icon"
              className="rounded-full h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {isRecording && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Merekam... Lepas untuk mengirim
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

