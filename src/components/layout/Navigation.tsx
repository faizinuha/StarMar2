import nekoPawLogo from '@/assets/Logo/NekoPaw.png';
import { CreatePostModal } from '@/components/posts/CreatePostModal';
import { NavigationSkeleton } from '@/components/skeletons/NavigationSkeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  Home,
  Laugh,
  MessageCircle,
  MoreHorizontal,
  Music,
  Play,
  PlusSquare,
  Search,
  Settings,
  Shield,
  User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AccountSwitcher } from './AccountSwitcher';

export const Navigation = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { totalUnread } = useConversations();
  const { unreadCount } = useNotifications();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('realtime-notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${user.id}` 
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      ).subscribe();

      return () => {
        supabase.removeChannel(channel);
      }
  }, [user, queryClient]);

  useEffect(() => {
    if (!authLoading && !user && location.pathname !== '/auth' && location.pathname !== '/auth/callback' && location.pathname !== '/auth/forgot-password') {
      navigate('/auth');
    }
  }, [user, authLoading, navigate, location.pathname]);

  if (authLoading || (profileLoading && user)) {
    return <NavigationSkeleton />;
  }

  const navItems = [
    { icon: Home, label: 'Home', path: '/', active: location.pathname === '/' },
    { icon: Search, label: 'Explore', path: '/explore', active: location.pathname === '/explore' },
    { icon: Play, label: 'Play', path: '/Reelms', active: location.pathname === '/Reelms' },
    { icon: PlusSquare, label: 'Create', path: '#', active: false, onClick: () => setShowCreateModal(true) },
    { icon: Laugh, label: 'Memes', path: '/memes', active: location.pathname === '/memes' },
    { icon: MessageCircle, label: 'Chat', path: '/chat', badge: totalUnread > 0 ? totalUnread : null, active: location.pathname.startsWith('/chat') },
    { icon: Heart, label: 'Notifications', path: '/notifications', badge: unreadCount > 0 ? unreadCount : null, active: location.pathname === '/notifications' },
    { icon: Music, label: 'MyMusic', path: '/mymusic/music', active: location.pathname === '/mymusic/music' },
    { icon: Settings, label: 'Settings', path: '/settings', active: location.pathname === '/settings' }
  ];

  const mobileBottomNavItems = [
    { icon: Home, label: 'Home', path: '/', active: location.pathname === '/' },
    { icon: Search, label: 'Explore', path: '/explore', active: location.pathname === '/explore' },
    { icon: Play, label: 'Play', path: '/reelms', active: location.pathname === '/reelms' },
    { icon: PlusSquare, label: 'Create', path: '#', active: false, onClick: () => setShowCreateModal(true) },
    { icon: Heart, label: 'Notifications', path: '/notifications', badge: unreadCount > 0 ? unreadCount : null, active: location.pathname === '/notifications' },
    { icon: User, label: 'Profile', path: '/profile', active: location.pathname === '/profile' }
  ];

  if (!user) {
    return null;
  }

  const handleNavigation = (path: string, onClick?: () => void) => {
    if (onClick) {
      onClick();
    } else if (path !== '#') {
      navigate(path);
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const hasMoreItems = profile?.role === 'admin' || profile?.role === 'moderator';

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-72 bg-card border-r border-border p-6 flex-col justify-between z-40">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <img
              src={nekoPawLogo}
              alt="NekoPaw"
              className="w-10 h-10 object-contain rounded-xl"
            />
            <span className="text-2xl font-bold text-primary">
              NekoPaw
            </span>
            <span className="text-lg">🐾</span>
          </div>

          {/* Navigation Items */}
          <div className="space-y-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Button
                  key={index}
                  variant={item.active ? 'secondary' : 'ghost'}
                  className={`w-full justify-start space-x-3 h-12 text-base rounded-xl ${item.active ? 'bg-primary/10 text-primary font-semibold' : ''}`}
                  onClick={() => handleNavigation(item.path, item.onClick)}
                >
                  <div className="relative">
                    <Icon className="h-6 w-6" />
                    {item.badge && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs nekopaw-gradient border-0 text-primary-foreground">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <span>{item.label}</span>
                </Button>
              );
            })}

            {hasMoreItems && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start space-x-3 h-12 text-base rounded-xl"
                  >
                    <MoreHorizontal className="h-6 w-6" />
                    <span>More</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-popover border border-border z-50" side="right" align="start">
                  {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                    <DropdownMenuItem onClick={() => navigate('/Admin_Dashbord')} className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Dashboard Admin</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* User Profile & Account Switcher */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 rounded-2xl bg-secondary/50">
            <div
              className="flex-1 min-w-0 flex items-center space-x-3 cursor-pointer"
              onClick={handleProfileClick}
            >
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {profile?.display_name?.[0] || profile?.username?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {profile?.display_name || profile?.username}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  @{profile?.username}
                </p>
              </div>
            </div>
            <AccountSwitcher />
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        {/* Top Bar */}
        <header className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md border-b border-border p-4 flex items-center justify-between z-50">
          <div className="flex items-center space-x-2">
            <img
              src={nekoPawLogo}
              alt="NekoPaw"
              className="w-8 h-8 object-contain rounded-lg"
            />
            <span className="text-xl font-bold text-primary">
              NekoPaw
            </span>
            <span className="text-sm">🐾</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate('/chat')}
            >
              <MessageCircle className={`h-6 w-6 ${location.pathname.startsWith('/chat') ? 'text-primary' : ''}`} />
              {totalUnread > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs nekopaw-gradient border-0 text-primary-foreground">
                  {totalUnread}
                </Badge>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
            >
              <Settings className={`h-6 w-6 ${location.pathname === '/settings' ? 'text-primary' : ''}`} />
            </Button>
          </div>
        </header>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-2 flex justify-around z-40">
          {mobileBottomNavItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Button
                key={index}
                variant="ghost"
                size="icon"
                className={`h-12 w-12 relative rounded-xl ${item.active ? 'text-primary bg-primary/10' : ''}`}
                onClick={() => handleNavigation(item.path, item.onClick)}
              >
                <Icon className={`h-6 w-6 ${item.active ? 'text-primary' : ''}`} />
                {item.badge && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs nekopaw-gradient border-0 text-primary-foreground">
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Spacer for fixed navigation */}
      <div className="hidden md:block w-72" />
      <div className="md:hidden h-16" />
      <div className="md:hidden h-16" />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
};
