import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversations, useCreateConversation } from '@/hooks/useConversations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Users, Search, Shield, Trash2, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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

export default function Chat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, isLoading } = useConversations();
  const { mutate: createConversation } = useCreateConversation();
  const queryClient = useQueryClient();
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);

  // Fetch admin user
  const { data: adminUser } = useQuery({
    queryKey: ['admin-user'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching admin:', error);
        return null;
      }
      return data;
    },
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
    if (!adminUser) {
      toast.error('Admin tidak ditemukan');
      return;
    }

    createConversation(
      { otherUserId: adminUser.user_id },
      {
        onSuccess: (conversationId) => {
          navigate(`/chat/${conversationId}`);
        },
        onError: () => {
          toast.error('Gagal membuat conversation dengan admin');
        },
      }
    );
  };

  const handleMarkAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user?.id);

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Ditandai sudah dibaca');
    } catch (error) {
      toast.error('Gagal menandai sebagai dibaca');
    }
  };

  const handleDeleteConversation = async () => {
    if (!deleteConvId) return;

    try {
      // Delete conversation member (user leaves conversation)
      await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', deleteConvId)
        .eq('user_id', user?.id);

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversation dihapus');
      setDeleteConvId(null);
    } catch (error) {
      toast.error('Gagal menghapus conversation');
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar - Instagram Style */}
      <div className="w-full md:w-96 border-r flex flex-col bg-background">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{user?.user_metadata?.username || 'Messages'}</h1>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages"
              className="pl-9 bg-muted/50"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Contact Support Section */}
              {adminUser && (
                <div className="border-b">
                  <div className="px-4 py-2 bg-muted/30">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Support</h3>
                  </div>
                  <div
                    onClick={handleContactAdmin}
                    className="flex items-center gap-3 p-4 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Avatar className="h-14 w-14 border-2 border-primary">
                      <AvatarImage src={adminUser.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10">
                        <Shield className="h-6 w-6 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">Admin Support</h3>
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground">Hubungi admin untuk bantuan</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Your Conversations Section */}
              {conversations.length > 0 && (
                <div className="px-4 py-2 bg-muted/30">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Conversations</h3>
                </div>
              )}

              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground font-medium">No conversations yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start a conversation by visiting a user's profile
                  </p>
                </div>
              ) : (
                <div>
                  {conversations.map((conversation) => (
                    <ContextMenu key={conversation.id}>
                      <ContextMenuTrigger>
                        <div
                          onClick={() => navigate(`/chat/${conversation.id}`)}
                          className="flex items-center gap-3 p-4 hover:bg-accent cursor-pointer transition-colors border-b"
                        >
                          <Avatar className="h-14 w-14 border-2 border-border">
                            <AvatarImage src={getConversationAvatar(conversation) || undefined} />
                            <AvatarFallback className="bg-muted">
                              {conversation.is_group ? (
                                <Users className="h-6 w-6" />
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
                              <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                {formatDistanceToNow(new Date(conversation.last_message_at), {
                                  addSuffix: false,
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className={`text-sm truncate flex-1 ${
                                conversation.unread_count > 0 
                                  ? 'font-semibold text-foreground' 
                                  : 'text-muted-foreground font-normal'
                              }`}>
                                {conversation.last_message || 'Start the conversation'}
                              </p>
                              {conversation.unread_count > 0 && (
                                <Badge 
                                  variant="default" 
                                  className="h-5 min-w-[20px] flex items-center justify-center px-1.5 text-xs rounded-full bg-primary"
                                >
                                  {conversation.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-48">
                        <ContextMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(conversation.id);
                          }}
                        >
                          <CheckCheck className="mr-2 h-4 w-4" />
                          <span>Mark as Read</span>
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConvId(conversation.id);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Hapus Conversation</span>
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content Area - Hidden on mobile, shown when conversation selected */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-muted/30">
        <div className="text-center p-8">
          <MessageCircle className="w-24 h-24 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your Messages</h2>
          <p className="text-muted-foreground">
            Select a conversation to start chatting
          </p>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConvId} onOpenChange={() => setDeleteConvId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Conversation ini akan dihapus dari daftar Anda. Anda masih bisa memulai conversation baru dengan user ini nanti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
