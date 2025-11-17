import { Navigation } from '@/components/layout/Navigation';
import { PostDetailModal } from '@/components/posts/PostDetailModal';
import { PostGrid } from '@/components/posts/PostGrid';
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
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowStatus, useToggleFollow } from '@/hooks/useFollow';
import { FollowListModal } from '@/components/profile/FollowListModal';
import {
  Post,
  useDeletePost,
  useTogglePostLike,
  useUserPosts,
} from '@/hooks/usePosts';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useCreateConversation } from '@/hooks/useConversations';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Bookmark,
  Calendar,
  Camera,
  Grid3X3,
  Heart,
  Link as LinkIcon,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useBookmarks } from '../hooks/useBookmarks';
import { toast } from 'sonner';

const PostCard = ({ post, authUser }) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);
  const { mutate: deletePost } = useDeletePost();
  const { mutate: toggleLike } = useTogglePostLike();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwnPost = authUser?.id === post.user_id;

  const handleLike = () => {
    toggleLike({ postId: post.id, isLiked });
    setIsLiked(!isLiked);
  };

  return (
    <Card className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center space-x-4">
        <Avatar className="w-12 h-12">
          <AvatarImage src={post.user.avatar} alt={post.user.displayName} />
          <AvatarFallback className="text-2xl">
            {post.user.displayName?.charAt(0) || ''}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h4 className="font-semibold">{post.user.displayName}</h4>
          <p className="text-sm text-muted-foreground">
            @{post.user.username} · {post.timestamp}
          </p>
        </div>
        {isOwnPost ? (
          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  className="text-red-500 focus:text-red-500 focus:bg-red-50"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your post.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-500 hover:bg-red-600"
                  onClick={() => deletePost(post.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div>
        {post.content && (
          <p className="text-foreground leading-relaxed whitespace-pre-line mb-4">
            {post.content}
          </p>
        )}
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post"
            className="w-full h-auto object-cover rounded-lg"
          />
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center space-x-4">
          <button onClick={handleLike} className="flex items-center space-x-1">
            <Heart
              fill={isLiked ? 'currentColor' : 'none'}
              className={`h-4 w-4 transition-colors ${isLiked ? 'text-red-500' : ''
                }`}
            />
            <span>{post.likes}</span>
          </button>
          <div className="flex items-center space-x-1">
            <MessageCircle className="h-4 w-4" />
            <span>{post.comments}</span>
          </div>
        </div>
        <button onClick={() => setIsBookmarked(!isBookmarked)}>
          <Bookmark
            fill={isBookmarked ? 'currentColor' : 'none'}
            className="h-4 w-4"
          />
        </button>
      </div>
    </Card>
  );
};

const ProfilePageContent = ({ profile, isLoading, error }) => {
  const { user: authUser } = useAuth();
  const { mutateAsync: updateProfileMutate } = useUpdateProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [followListType, setFollowListType] = useState<'followers' | 'following' | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createConversation } = useCreateConversation();

  const { data: posts, isLoading: postsLoading } = useUserPosts(
    profile?.user_id
  );
  const { data: isFollowing = false, isLoading: followLoading } =
    useFollowStatus(profile?.user_id || '');
  const { mutate: toggleFollow } = useToggleFollow();
  const { bookmarks, isLoading: bookmarksLoading } = useBookmarks();

  const pageLoading = isLoading || postsLoading || followLoading;

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <p className="text-xl font-semibold text-red-500">Error</p>
        <p className="text-muted-foreground">
          {error?.message || 'Profile not found.'}
        </p>
      </div>
    );
  }

  const userPosts: (Post & { timestamp: string })[] = posts
    ? posts.map((post) => ({
      ...post,
      timestamp: format(new Date(post.created_at), 'PP'),
    }))
    : [];

  const bookmarkedPosts = userPosts.filter((post) =>
    bookmarks?.some((bookmark) => bookmark.post_id === post.id)
  );

  const isOwnProfile = authUser?.id === profile?.user_id;
  const showContent = !profile.is_private || isOwnProfile || isFollowing;

  const updateProfile = async (updates: Partial<any>) => {
    try {
      await updateProfileMutate(updates);
    } catch (err) {
      console.error('Failed to update profile', err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="md:ml-72 min-h-screen pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Profile Header */}
          <Card className="mb-6 overflow-hidden animate-fade-in">
            {/* Cover Image */}
            <div className="h-48 md:h-64 relative overflow-hidden">
              <img
                src={
                  profile.cover_img ||
                  profile.avatar_url ||
                  '/placeholder-cover.jpg'
                }
                alt="Cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              {/* Cover edit button */}
              {authUser && (
                <div className="absolute right-4 bottom-4">
                  <input
                    ref={coverInputRef}
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !authUser) return;

                      const localImageUrl = URL.createObjectURL(file);
                      queryClient.setQueryData(
                        ['profile', authUser.id],
                        (oldData: any) =>
                          oldData
                            ? { ...oldData, cover_img: localImageUrl }
                            : oldData
                      );

                      try {
                        const ext = file.name.split('.').pop();
                        const filePath = `${authUser.id
                          }/cover-${Date.now()}.${ext}`;
                        const { error: uploadErr } = await supabase.storage
                          .from('avatars')
                          .upload(filePath, file, { upsert: true });
                        if (uploadErr) throw uploadErr;
                        await updateProfile({ cover_img: filePath });
                      } catch (err) {
                        console.error('Cover upload failed', err);
                        queryClient.invalidateQueries({
                          queryKey: ['profile', authUser.id],
                        });
                      } finally {
                        URL.revokeObjectURL(localImageUrl);
                        if (e.target) {
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-20 md:-mt-16">
                {/* Avatar & Basic Info */}
                <div className="flex flex-col md:flex-row md:items-end md:space-x-6">
                  <div className="relative inline-block">
                    <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                      <AvatarImage
                        src={profile.avatar_url || '/placeholder-avatar.jpg'}
                        alt={profile.display_name}
                      />
                      <AvatarFallback className="text-2xl">
                        {profile.display_name?.charAt(0) ||
                          profile.username?.charAt(0) ||
                          ''}
                      </AvatarFallback>
                    </Avatar>

                    {/* Avatar edit (only for own profile) */}
                    {isOwnProfile && authUser && (
                      <div className="absolute right-0 bottom-0">
                        <input
                          ref={avatarInputRef}
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !authUser) return;

                            const localImageUrl = URL.createObjectURL(file);
                            queryClient.setQueryData(
                              ['profile', authUser.id],
                              (oldData: any) =>
                                oldData
                                  ? { ...oldData, avatar_url: localImageUrl }
                                  : oldData
                            );

                            try {
                              const ext = file.name.split('.').pop();
                              const filePath = `${authUser.id
                                }/avatar-${Date.now()}.${ext}`;
                              const { error: uploadErr } =
                                await supabase.storage
                                  .from('avatars')
                                  .upload(filePath, file, { upsert: true });
                              if (uploadErr) throw uploadErr;
                              await updateProfile({ avatar_url: filePath });
                            } catch (err) {
                              console.error('Avatar upload failed', err);
                              queryClient.invalidateQueries({
                                queryKey: ['profile', authUser.id],
                              });
                            } finally {
                              URL.revokeObjectURL(localImageUrl);
                              if (e.target) {
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => avatarInputRef.current?.click()}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 md:mt-0 md:mb-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold">
                        {profile.display_name || profile.username}
                      </h1>
                      {profile.is_verified && (
                        <Badge className="starmar-gradient text-white border-0">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-lg">
                      @{profile.username}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3 mt-4 md:mt-0">
                  {isOwnProfile ? (
                    <Button variant="outline" asChild>
                      <Link to="/settings">Edit Profile</Link>
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant={isFollowing ? 'outline' : 'default'}
                        className={!isFollowing ? 'gradient-button' : ''}
                        onClick={() =>
                          toggleFollow({ userId: profile.user_id, isFollowing })
                        }
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          createConversation(
                            { otherUserId: profile.user_id },
                            {
                              onSuccess: (conversationId) => {
                                navigate(`/chat/${conversationId}`);
                              },
                              onError: () => {
                                toast.error('Gagal membuat percakapan');
                              },
                            }
                          );
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Bio & Details */}
              <div className="mt-6 space-y-4">
                <p className="text-foreground whitespace-pre-line leading-relaxed">
                  {profile.bio}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {profile.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center space-x-1">
                      <LinkIcon className="h-4 w-4" />
                      <a
                        href={`https://${profile.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Joined{' '}
                      {format(
                        new Date(profile.join_date || profile.created_at),
                        'MMMM yyyy'
                      )}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-6 pt-2">
                  <div className="text-center">
                    <p className="font-bold text-lg">
                      {profile.posts_count.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Posts</p>
                  </div>
                  <div className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => setFollowListType('followers')}>
                    <p className="font-bold text-lg">
                      {profile.followers_count.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Followers</p>
                  </div>
                  <div className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => setFollowListType('following')}>
                    <p className="font-bold text-lg">
                      {profile.following_count.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Following</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Content Tabs */}
          <Tabs defaultValue="posts" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-96 mx-auto">
              <TabsTrigger
                value="posts"
                className="flex items-center space-x-2"
              >
                <Grid3X3 className="h-4 w-4" />
                <span>Posts</span>
              </TabsTrigger>
              <TabsTrigger
                value="saved"
                className="flex items-center space-x-2"
              >
                <Bookmark className="h-4 w-4" />
                <span>Saved</span>
              </TabsTrigger>
              <TabsTrigger
                value="liked"
                className="flex items-center space-x-2"
              >
                <Heart className="h-4 w-4" />
                <span>Liked</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-6">
              {!showContent ? (
                <div className="text-center py-12">
                  <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    This account is private
                  </h3>
                  <p className="text-muted-foreground">
                    Follow this account to see their posts.
                  </p>
                </div>
              ) : userPosts.length > 0 ? (
                <PostGrid
                  posts={userPosts}
                  onPostClick={(post) => setSelectedPost(post)}
                />
              ) : (
                <div className="text-center py-12">
                  <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Belum ada post</h3>
                  <p className="text-muted-foreground">
                    Pengguna ini belum membuat postingan apa pun.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="saved" className="space-y-6">
              {bookmarkedPosts.length > 0 ? (
                <PostGrid
                  posts={bookmarkedPosts}
                  onPostClick={(post) => setSelectedPost(post)}
                />
              ) : (
                <div className="text-center py-12">
                  <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No saved posts yet
                  </h3>
                  <p className="text-muted-foreground">
                    Posts you save will appear here for easy access later.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="liked" className="space-y-6">
              <div className="text-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No liked posts yet
                </h3>
                <p className="text-muted-foreground">
                  Posts you like will appear here so you can find them again.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Post Detail Modal */}
      <PostDetailModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
      
      {/* Follow List Modal */}
      {followListType && (
        <FollowListModal
          isOpen={!!followListType}
          onClose={() => setFollowListType(null)}
          userId={profile.user_id}
          type={followListType}
        />
      )}
    </div>
  );
};

const Profile = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user: authUser } = useAuth();

  const profileId = userId || authUser?.id;

  const { data: profile, isLoading, error } = useProfile(profileId);

  return (
    <ProfilePageContent profile={profile} isLoading={isLoading} error={error} />
  );
};

export default Profile;
