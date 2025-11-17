import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Search,
  PlusSquare,
  Heart,
  MessageCircle,
  User,
  Menu,
  X,
  Settings,
  Laugh,
  Music,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useConversations } from '@/hooks/useConversations';
import { useNotifications } from '@/hooks/useNotifications';
import { CreatePostModal } from '@/components/posts/CreatePostModal';
import { AccountSwitcher } from './AccountSwitcher';
import { NavigationSkeleton } from '@/components/skeletons/NavigationSkeleton';

export const Navigation = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { totalUnread } = useConversations();
  const { unreadCount } = useNotifications();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to auth if not authenticated and not loading
  useEffect(() => {
    if (!authLoading && !user && location.pathname !== '/auth' && location.pathname !== '/auth/callback') {
      navigate('/auth');
    }
  }, [user, authLoading, navigate, location.pathname]);

  // Show skeleton while auth is loading or if we're checking authentication
  if (authLoading || (profileLoading && user)) {
    return <NavigationSkeleton />;
  }

  const navItems = [
    { icon: Home, label: 'Home', path: '/', active: location.pathname === '/' },
    {
      icon: Search,
      label: 'Explore',
      path: '/explore',
      active: location.pathname === '/explore',
    },
    {
      icon: PlusSquare,
      label: 'Create',
      path: '#',
      active: false,
      onClick: () => setShowCreateModal(true),
    },
    {
      icon: Laugh,
      label: 'Memes',
      path: '/memes',
      active: location.pathname === '/memes',
    },
    {
      icon: MessageCircle,
      label: 'Chat',
      path: '/chat',
      badge: totalUnread > 0 ? totalUnread : null,
      active: location.pathname.startsWith('/chat'),
    },
    {
      icon: Heart,
      label: 'Notifications',
      path: '/notifications',
      badge: unreadCount > 0 ? unreadCount : null,
      active: location.pathname === '/notifications',
    },
    {
      icon: Music,
      label: 'MyMusic',
      path: '/mymusic/music',
      active: location.pathname === '/mymusic/music',
    }
  ];

  // Mobile bottom navbar items (only 4 items: Home, Explore, Create, Memes)
  const mobileBottomNavItems = [
    { icon: Home, label: 'Home', path: '/', active: location.pathname === '/' },
    {
      icon: Search,
      label: 'Explore',
      path: '/explore',
      active: location.pathname === '/explore',
    },
    {
      icon: PlusSquare,
      label: 'Create',
      path: '#',
      active: false,
      onClick: () => setShowCreateModal(true),
    },
    {
      icon: Laugh,
      label: 'Memes',
      path: '/memes',
      active: location.pathname === '/memes',
    },
  ];

  // Don't render navigation if user is not authenticated
  if (!user) {
    return null;
  }

  const handleNavigation = (path: string, onClick?: () => void) => {
    if (onClick) {
      onClick();
    } else if (path !== '#') {
      navigate(path);
    }
    setIsMenuOpen(false);
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setIsMenuOpen(false);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-72 bg-card border-r border-border p-6 flex-col justify-between z-40">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img
              src="/assets/Logo/StarMar-.png"
              alt="StarMar"
              className="w-10 h-10 object-contain"
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              StarMar
            </span>
          </div>

          {/* Navigation Items */}
          <div className="space-y-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Button
                  key={index}
                  variant={item.active ? 'secondary' : 'ghost'}
                  className="w-full justify-start space-x-3 h-12 text-base"
                  onClick={() => handleNavigation(item.path, item.onClick)}
                >
                  <div className="relative">
                    <Icon className="h-6 w-6" />
                    {item.badge && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs starmar-gradient border-0">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <span>{item.label}</span>
                </Button>
              );
            })}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start space-x-3 h-12 text-base"
                >
                  <Menu className="h-6 w-6" />
                  <span>More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" side="right" align="start">
                {profile?.role === 'admin' && (
                  <DropdownMenuItem onClick={() => navigate('/Admin_Dashbord')}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Dashboard Admin</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSettingsClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* User Profile & Account Switcher */}
        <div className="space-y-4">

          <div className="flex items-center space-x-3 p-3 rounded-2xl bg-secondary">
            <div
              className="flex-1 min-w-0 flex items-center space-x-3 cursor-pointer"
              onClick={handleProfileClick}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>
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
        <header className="fixed top-0 left-0 right-0 bg-card border-b border-border p-4 flex items-center justify-between z-50">
          <div className="flex items-center space-x-3">
            <img
              src="/assets/Logo/StarMar.png"
              alt="StarMar"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              StarMar
            </span>
          </div>

          {/* Message Icon with Badge */}
          <Button 
            variant="ghost" 
            size="icon"
            className="relative"
            onClick={() => navigate('/chat')}
          >
            <MessageCircle className={`h-6 w-6 ${location.pathname.startsWith('/chat') ? 'text-primary' : ''}`} />
            {totalUnread > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs starmar-gradient border-0">
                {totalUnread}
              </Badge>
            )}
          </Button>
        </header>

        {/* Bottom Navigation - Only 4 items */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 flex justify-around z-40">
          {mobileBottomNavItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Button
                key={index}
                variant="ghost"
                size="icon"
                className="h-12 w-12 relative"
                onClick={() => handleNavigation(item.path, item.onClick)}
              >
                <Icon
                  className={`h-6 w-6 ${item.active ? 'text-primary' : ''}`}
                />
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
