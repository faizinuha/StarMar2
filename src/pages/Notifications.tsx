import { Navigation } from '@/components/layout/Navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PostDetailModal } from '@/components/posts/PostDetailModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  Bell,
  BellRing,
  CheckCheck,
  Clock,
  Heart,
  Loader2,
  MessageCircle,
  UserPlus,
  Info,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Tables } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

// Define PostForModal type
interface PostForModal {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  likes: number;
  comments: number;
  comments_count: number;
  isLiked: boolean;
  likes_count: number;
  profiles: { username: string; display_name: string; avatar_url: string };
  isBookmarked: boolean;
  location?: string;
  user: { username: string; displayName: string; avatar: string };
  media_type?: string;
}
// Definisikan tipe untuk data yang digabungkan
type Profile = Tables<'profiles'>;
type NotificationFromDb = Tables<'notifications'>;
type PostFromDb = Tables<'posts'>;
type UserNotificationFromDb = Tables<'user_notifications'>;

type CombinedNotification = (
  | (Omit<NotificationFromDb, 'from_user_id'> & { from_user: Profile | null; title?: never; message?: never; post_id: string | null })
  | (UserNotificationFromDb & { from_user?: null; from_user_id?: never })
) & {
  // Pastikan properti umum ada
  id: string;
  created_at: string;
};
export const Notifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedPost, setSelectedPost] = useState<PostForModal | null>(null);
  const { deleteNotification, markAsRead: markSingleAsRead } = useNotifications();

  // 🔹 Fetch notifications dari Supabase
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // 1. Fetch standard notifications
      const { data: standardNotifications, error: standardError } =
        await supabase
          .from('notifications')
          .select('id, type, created_at, is_read, from_user_id, post_id')
          .eq('user_id', user.id);

      if (standardError) {
        console.error('Error fetching standard notifications:', standardError);
        // Lanjutkan meski gagal, mungkin notifikasi sistem masih bisa diambil
      }

      // 2. Fetch system notifications
      const { data: systemNotifications, error: systemError } = await supabase
        .from('user_notifications')
        .select('id, title, message, type, created_at, is_read')
        .eq('user_id', user.id);

      if (systemError) {
        console.error('Error fetching system notifications:', systemError);
      }

      const allNotifications: CombinedNotification[] = [];

      // Proses notifikasi standar
      if (standardNotifications && standardNotifications.length > 0) {
        const fromUserIds = [
          ...new Set(standardNotifications.map((n) => n.from_user_id).filter((id) => id)),
        ];

        let profilesMap = new Map<string, Profile>();
        if (fromUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('user_id', fromUserIds);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
          } else {
            profilesMap = new Map(profilesData.map((p) => [p.user_id, p]));
          }
        }

        const combinedStandard = standardNotifications.map((notification) => ({
          ...notification,
          from_user: profilesMap.get(notification.from_user_id) || null,
        })) as any;
        allNotifications.push(...combinedStandard);
      }

      // Tambahkan notifikasi sistem
      if (systemNotifications && systemNotifications.length > 0) {
        allNotifications.push(
          ...(systemNotifications.map((notification: any) => ({
            ...notification,
            from_user: null, // System notifications don't have a 'from_user'
            from_user_id: undefined, // Ensure from_user_id is not present
          })) as CombinedNotification[])
        );
      }

      // Urutkan semua notifikasi berdasarkan tanggal pembuatan
      allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return allNotifications;
    },
    enabled: !!user,
  });

  // 🔹 Setup real-time subscriptions for notifications
  useEffect(() => {
    if (!user) return;

    // Buat instance Audio di luar handler agar tidak dibuat ulang setiap saat
    const notificationSound = new Audio('/assets/sounds/notification.mp3');

    const handleNewNotification = () => {
      // Invalidate query untuk memicu refetch
      queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      // Putar suara notifikasi
      notificationSound.play().catch(error => console.error("Error playing sound:", error));
    };

    // Subscription untuk notifikasi standar (like, comment, follow)
    const standardNotificationsChannel = supabase
      .channel('public:notifications:user_id=eq.' + user.id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        handleNewNotification
      )
      .subscribe();

    // Subscription untuk notifikasi sistem
    const systemNotificationsChannel = supabase
      .channel('public:user_notifications:user_id=eq.' + user.id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
        handleNewNotification
      )
      .subscribe();

    // Cleanup subscriptions on component unmount
    return () => {
      supabase.removeChannel(standardNotificationsChannel);
      supabase.removeChannel(systemNotificationsChannel);
    };
  }, [user, queryClient]);

  // 🔹 Mark all as read
  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // 🔹 Mark a single notification as read
  const markAsRead = useMutation({
    mutationFn: async (notification: CombinedNotification) => {
      if (!user || notification.is_read) return;

      // Tentukan tabel mana yang akan diupdate berdasarkan properti notifikasi
      const tableName = 'from_user_id' in notification ? 'notifications' : 'user_notifications';

      const { error } = await supabase
        .from(tableName)
        .update({ is_read: true })
        .eq('id', notification.id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate query untuk memperbarui UI
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: (error) => {
      console.error("Failed to mark notification as read:", error);
    }
  });

  // 🔹 Fetch post data for modal
  const fetchPostForModal = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) return null;
      const { data: postData, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url
          ),
          post_media (
            media_url,
            media_type
          ),
          likes_count,
          comments_count,
          user_likes:likes(user_id)
        `)
        .eq('id', postId)
        .single();

      if (error) {
        console.error('Error fetching post for modal:', error);
        throw error;
      }

      // Transform data to match the PostCard/PostForModal type
      const transformedPost: PostForModal = {
        ...postData,
        content: postData.caption || '',
        user: {
          username: postData.profiles?.username || '',
          displayName: postData.profiles?.display_name || postData.profiles?.username || '',
          avatar: postData.profiles?.avatar_url || '',
        },
        likes: postData.likes_count || 0,
        comments: postData.comments_count || 0,
        isLiked: postData.user_likes.some((like: { user_id: string }) => like.user_id === user.id),
        isBookmarked: false, // TODO: Implement bookmark logic if needed
        image_url: postData.post_media?.[0]?.media_url,
        media_type: postData.post_media?.[0]?.media_type,
      };

      return transformedPost;
    },
    onSuccess: (data) => {
      if (data) {
        setSelectedPost(data);
      }
    },
    onError: (error) => {
      console.error("Failed to fetch post details:", error);
    }
  });

  // 🔹 Handle notification click for navigation
  const handleNotificationClick = (notification: CombinedNotification) => {
    // 1. Mark notification as read
    markAsRead.mutate(notification);

    // 2. Navigate based on notification type
    switch (notification.type) {
      case 'like':
      case 'comment':
        // For likes and comments, if there's a post_id, fetch the post and open the detail modal.
        if ('post_id' in notification && notification.post_id) {
          fetchPostForModal.mutate(notification.post_id);
        }
        break;
      case 'follow':
        // For follows, if there's a from_user_id, navigate to that user's profile.
        if ('from_user_id' in notification && notification.from_user_id) {
          navigate(`/profile/${notification.from_user_id}`);
        }
        break;
      // System notifications or other types will intentionally do nothing.
      default:
        console.log(`Unhandled notification type: ${notification.type}`);
        break;
    }
  };

  // 🔹 Icons
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'system':
        return <Info className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // 🔹 Messages
  const getNotificationMessage = (type: string, fromUser: any) => {
    // Handle notifikasi sistem yang tidak memiliki fromUser
    if (type === 'system') {
      return 'System Notification';
    }

    const displayName =
      fromUser?.display_name || fromUser?.username || 'Someone';

    switch (type) {
      case 'like':
        return `${displayName} liked your post`;
      case 'comment':
        return `${displayName} commented on your post`;
      case 'follow':
        return `${displayName} started following you`;
      default:
        return `${displayName} sent you a notification`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="md:ml-72 min-h-screen pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Notifications
              </h1>
              <p className="text-muted-foreground mt-2">
                Stay updated with your latest activities
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Mark All Read
            </Button>
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          <div className="space-y-4">
            {notifications?.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 hover:bg-muted/50 transition-colors ${!notification.is_read ? 'border-primary/20 bg-primary/5' : ''
                  }`}
              >
                <div className="flex items-start gap-4">
                  {notification.from_user ? (
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={notification.from_user.avatar_url || undefined}
                      />
                      <AvatarFallback>
                        {notification.from_user.display_name?.charAt(0) ||
                          notification.from_user.username?.charAt(0) ||
                          'U'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {getNotificationIcon(notification.type)}
                    </div>
                  )}

                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {notification.from_user && getNotificationIcon(notification.type)}
                      <div className="text-sm">
                        <p className="font-semibold">
                          {notification.title || getNotificationMessage(notification.type, notification.from_user)}
                        </p>
                        {notification.message && (
                          <p className="text-muted-foreground">
                            {notification.message}
                          </p>
                        )}
                      </div>
                      {!notification.is_read && (
                        <Badge variant="secondary" className="text-xs ml-auto flex-shrink-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(
                          parseISO(notification.created_at),
                          { addSuffix: true }
                        )}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification.mutate({
                        id: notification.id,
                        type: 'from_user_id' in notification ? 'standard' : 'system'
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {notifications?.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <BellRing className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No notifications yet
              </h3>
              <p className="text-muted-foreground">
                When someone likes, comments, or follows you, you'll see it here
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Post Detail Modal */}
      <PostDetailModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </div>
  );
};