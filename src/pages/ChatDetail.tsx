import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, MoreVertical, Phone, Video, Paperclip, X, Image as ImageIcon, FileText, Music, Mic, Square, Play, MessageCircle, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ChatDetail() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, isLoading } = useMessages(chatId);
  const { conversations } = useConversations();
  const { mutate: sendMessage } = useSendMessage();
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if ((!newMessage.trim() && !selectedFile && !audioBlob) || !chatId) return;

    const fileToSend = audioBlob ? new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' }) : selectedFile;

    sendMessage({
      conversationId: chatId,
      content: newMessage.trim(),
      file: fileToSend || undefined,
    });
    setNewMessage('');
    setSelectedFile(null);
    setAudioBlob(null);
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
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

  const getAttachmentUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  const otherUser = messages[0]?.sender_id !== user?.id ? messages[0]?.sender : messages[1]?.sender;

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
                  <AvatarImage src={getConversationAvatar(conversation) || undefined} />
                  <AvatarFallback className="bg-muted">
                    {conversation.is_group ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      getConversationName(conversation)[0]?.toUpperCase()
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold truncate text-sm">
                      {getConversationName(conversation)}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.last_message_at), {
                        addSuffix: false,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs truncate flex-1 text-muted-foreground">
                      {conversation.last_message || 'Start conversation'}
                    </p>
                    {conversation.unread_count > 0 && conversation.id !== chatId && (
                      <Badge variant="default" className="h-4 min-w-[16px] flex items-center justify-center px-1 text-xs rounded-full">
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
                  {otherUser?.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="font-semibold text-sm">{otherUser?.display_name || 'Chat'}</h1>
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
              <h3 className="text-lg font-semibold">Selamat datang di chat {otherUser?.display_name || 'user'}</h3>
              <p className="text-sm text-muted-foreground">Chat ini terenkripsi end-to-end, jadi aman! 🔒</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`flex items-start gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className={`space-y-2 ${i % 2 === 0 ? '' : 'items-end'}`}>
                  <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-64' : 'w-48'} rounded-2xl`} />
                </div>
              </div>
            ))}
          </div>
        ) : messages.map((message) => {
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
              <div
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
                  {message.attachment_url && (
                    <div className="mb-2">
                      {message.attachment_type?.startsWith('image/') ? (
                        <img 
                          src={supabase.storage.from('chat-attachments').getPublicUrl(message.attachment_url).data.publicUrl}
                          alt="Attachment"
                          className="max-w-full rounded-lg max-h-60 object-cover cursor-pointer"
                          onClick={async (e) => {
                            const url = await getAttachmentUrl(message.attachment_url!);
                            if (url) window.open(url, '_blank');
                          }}
                          onError={async (e) => {
                            const url = await getAttachmentUrl(message.attachment_url!);
                            if (url) e.currentTarget.src = url;
                          }}
                        />
                      ) : message.attachment_type?.startsWith('video/') ? (
                        <video 
                          controls 
                          className="max-w-full rounded-lg max-h-60"
                          src={supabase.storage.from('chat-attachments').getPublicUrl(message.attachment_url).data.publicUrl}
                          onError={async (e) => {
                            const url = await getAttachmentUrl(message.attachment_url!);
                            if (url) e.currentTarget.src = url;
                          }}
                        />
                      ) : message.attachment_type?.startsWith('audio/') ? (
                        <audio controls className="max-w-full">
                          <source src={supabase.storage.from('chat-attachments').getPublicUrl(message.attachment_url).data.publicUrl} />
                        </audio>
                      ) : (
                        <a 
                          href={supabase.storage.from('chat-attachments').getPublicUrl(message.attachment_url).data.publicUrl}
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
                  {message.content && <p className="text-sm break-words leading-relaxed">{message.content}</p>}
                </div>
                <span className="text-xs text-muted-foreground mt-1 px-2">
                  {formatDistanceToNow(new Date(message.created_at), {
                    addSuffix: false,
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Instagram Style */}
      <div className="border-t p-3 bg-background">
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
                  <span className="text-sm flex-1 truncate">{selectedFile?.name}</span>
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
              className={`rounded-full h-10 w-10 ${isRecording ? 'bg-destructive text-destructive-foreground' : ''}`}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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
            disabled={(!newMessage.trim() && !selectedFile && !audioBlob) || isRecording}
            size="icon"
            className="rounded-full h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {isRecording && (
          <p className="text-xs text-center text-muted-foreground mt-2">Merekam... Lepas untuk mengirim</p>
        )}
      </div>
      </div>
    </div>
  );
}
