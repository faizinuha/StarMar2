import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/layout/Navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingTags } from "@/components/posts/TrendingTags";
import { useTrendingTags, usePostsByTag } from "@/hooks/useTags";
import { useFollowStatus, useToggleFollow } from "@/hooks/useFollow";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  TrendingUp,
  Hash,
  MapPin,
  Users,
  Image as ImageIcon,
  Video,
  Heart,
  MessageCircle,
  User,
  Loader2,
  Compass,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Post } from "@/hooks/usePosts";
import { PostDetailModal } from "@/components/posts/PostDetailModal";

type UserProfile = {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
};

const dummyAvatar = (seed: string) => `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}`;


const EmptyState = ({ icon, title, message, children }: { icon: React.ReactNode, title: string, message: string, children?: React.ReactNode }) => (
  <div className="text-center py-12 animate-fade-in">
    <div className="text-muted-foreground mx-auto mb-4">{icon}</div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
      {message}
    </p>
    {children}
  </div>
);

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("trending");
  const [searchParams] = useSearchParams();
  const tagFromUrl = searchParams.get('tag');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Set active tab to hashtags if tag is provided
  useEffect(() => {
    if (tagFromUrl) {
      setActiveTab("hashtags");
    }
  }, [tagFromUrl]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="md:ml-72 min-h-screen pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Explore
            </h1>
            <p className="text-muted-foreground mt-2">
              Discover new posts, people, and trends.
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-4 lg:w-96">
              <TabsTrigger value="trending" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Trending</span>
              </TabsTrigger>
              <TabsTrigger value="people" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">People</span>
              </TabsTrigger>
              <TabsTrigger value="hashtags" className="flex items-center space-x-2">
                <Hash className="h-4 w-4" />
                <span className="hidden sm:inline">Tags</span>
              </TabsTrigger>
              <TabsTrigger value="places" className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Places</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trending" className="space-y-8">
              <TrendingContent onPostClick={setSelectedPost} />
            </TabsContent>

            <TabsContent value="people" className="space-y-6">
              <PeopleContent />
            </TabsContent>

            <TabsContent value="hashtags" className="space-y-6">
              <HashtagsContent />
            </TabsContent>

            <TabsContent value="places" className="space-y-6">
              <EmptyState icon={<MapPin className="h-12 w-12 text-muted-foreground" />} title="Explore Places" message="Discover popular locations and see what's happening around the world.">
                <Button className="gradient-button">
                  Enable Location Services
                </Button>
              </EmptyState>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <PostDetailModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </div>
  );
};

const TrendingContent = ({ onPostClick }: { onPostClick: (post: Post) => void }) => {
  const { user } = useAuth();
  const { data: posts, isLoading } = useQuery<Post[]>({ 
    queryKey: ["trending_posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          user_id,
          caption,
          location,
          created_at,
          likes_count,
          comments_count,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url
          ),
          post_media (
            media_url,
            media_type
          ),
          user_likes: likes(user_id)
        `)
        .order("likes_count", { ascending: false })
        .limit(18);
      if (error) throw error;
      
      return data.map((post: any) => ({
        id: post.id,
        content: post.caption || '',
        location: post.location,
        created_at: post.created_at,
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        isLiked: post.user_likes.some((like: { user_id: string }) => like.user_id === user?.id),
        isBookmarked: false,
        image_url: post.post_media?.[0]?.media_url,
        media_type: post.post_media?.[0]?.media_type,
        user: {
          username: post.profiles?.username || '',
          displayName: post.profiles?.display_name || post.profiles?.username || '',
          avatar: post.profiles?.avatar_url || '',
        },
        user_id: post.user_id,
      })) as Post[];
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!posts || posts.length === 0) return <EmptyState icon={<TrendingUp className="h-12 w-12" />} title="No Trending Posts" message="Check back later to see what's popular." />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {posts.map((post) => {
        const hasImage = !!post.image_url && post.media_type !== 'video';
        const isVideo = post.media_type === 'video' && !!post.image_url;
        const caption = post.content || '';

        return (
          <div key={post.id} className="relative aspect-square group cursor-pointer overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 bg-gray-50 flex items-center justify-center" onClick={() => onPostClick(post)}>
            {isVideo ? (
              <video
                src={post.image_url}
                loop={true}
                muted={true}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : hasImage ? (
              <img
                src={post.image_url}
                alt="Trending post"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-2xl"
              />
            ) : caption ? (
              <div className="p-4 text-left w-full h-full flex items-center justify-center">
                <div className="bg-white/80 rounded-xl p-4 w-full h-full flex items-center justify-center text-center">
                  <p className="text-sm text-foreground line-clamp-6 px-2">{caption}</p>
                </div>
              </div>
            ) : (
              <img
                src={'/placeholder-image.jpg'}
                alt="Trending post"
                className="w-full h-full object-cover rounded-2xl"
              />
            )}

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-2xl">
              <div className="flex items-center space-x-6 text-white font-semibold">
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5" />
                  <span className="text-sm">{post.likes?.toLocaleString?.() ?? 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm">{post.comments ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PeopleContent = () => {
  const { user: currentUser } = useAuth();
  const { data: realUsers, isLoading } = useQuery<UserProfile[]>({
    queryKey: ["suggested_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          username,
          display_name,
          avatar_url,
          bio,
          followers_count
        `)
        .order("followers_count", { ascending: false })
      if (error) throw error;
      return data;
    },
  });

  const users = realUsers || [];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!users || users.length === 0) return <EmptyState icon={<Users className="h-12 w-12" />} title="No Suggested Users" message="We'll suggest people to follow here soon." />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {users.map((user) => (
        <UserCard key={user.id} user={user} currentUser={currentUser} />
      ))}
    </div>
  );
};

const UserCard = ({ user, currentUser }) => {
  const { data: isFollowing = false } = useFollowStatus(user.user_id || user.id);
  const { mutate: toggleFollow } = useToggleFollow();

  const handleFollow = () => {
    if (user.user_id || user.id) {
      toggleFollow({
        userId: user.user_id || user.id,
        isFollowing
      });
    }
  };

  return (
    <Link to={`/profile/${user.user_id}`}>
      <Card className="p-6 text-center hover:shadow-2xl transition-shadow h-full flex flex-col items-center rounded-3xl">
        <Avatar className="h-28 w-28 mb-4 ring-4 ring-white shadow">
          <AvatarImage src={user.avatar_url} alt={user.display_name} />
          <AvatarFallback className="text-2xl">
            {user.display_name?.charAt(0) || user.username?.charAt(0) || ''}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1 mb-4 text-center">
          <h3 className="font-semibold text-lg truncate" title={user.display_name || user.username}>
            {user.display_name || user.username}
          </h3>
          <p className="text-muted-foreground text-sm">@{user.username}</p>
          <p className="text-sm text-muted-foreground">{user.followers_count.toLocaleString()} followers</p>
          <p className="text-sm line-clamp-2 h-12 mt-2">{user.bio}</p>
        </div>
        {user.user_id !== currentUser?.id && user.id !== currentUser?.id && (
          <Button
            className={`w-full mt-auto rounded-full py-3 ${isFollowing ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : 'gradient-button'}`}
            onClick={(e) => {
              e.preventDefault();
              handleFollow();
            }}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </Card>
    </Link>
  );
};



const HashtagsContent = () => {
  const [searchParams] = useSearchParams();
  const tagFromUrl = searchParams.get('tag');
  const { data: trendingTags = [], isLoading: tagsLoading } = useTrendingTags(20);
  const { data: postsForTag = [], isLoading: postsLoading } = usePostsByTag(tagFromUrl || '');

  // Show posts for specific tag if coming from URL parameter
  if (tagFromUrl) {
    if (postsLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
          <Hash className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Posts tagged with {tagFromUrl}</h2>
        </div>

        {postsForTag.length === 0 ? (
          <EmptyState
            icon={<Hash className="h-12 w-12" />}
            title="No posts found"
            message={`No posts found with the tag ${tagFromUrl}`}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postsForTag.map((post: any) => (
              <Card key={post.id} className="p-4 space-y-3">
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                <div className="space-y-2">
                  <Link to={`/profile/${post.user.username}`} className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={post.user.avatar} />
                      <AvatarFallback>
                        {post.user.displayName?.[0] || post.user.username?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{post.user.displayName || post.user.username}</span>
                  </Link>
                  <p className="text-sm">{post.content}</p>
                  <div className="flex items-center gap-4 text-muted-foreground text-sm">
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      {post.likes}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      {post.comments}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default hashtags view
  if (tagsLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TrendingTags limit={20} />
    </div>
  );
};

export default Explore;