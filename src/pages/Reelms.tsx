import { Navigation } from "@/components/layout/Navigation";
import { BookmarkFolderDialog } from "@/components/posts/BookmarkFolderDialog";
import { ReportDialog } from "@/components/posts/ReportDialog";
import { UnifiedCommentModal } from "@/components/posts/UnifiedCommentModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SyntheticEvent, useEffect, useRef, useState } from "react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { usePostComments } from "@/hooks/useComments";
import { useLikes } from "@/hooks/useLikes";
import { Post, useAllPosts } from "@/hooks/usePosts";
import { useDeletePost } from "@/hooks/useProfile";
import {
    Bookmark,
    Heart,
    Loader2,
    MessageCircle,
    MoreHorizontal,
    Music,
    Play,
    Share,
    Volume2,
    VolumeX
} from "lucide-react";


// Helper to format numbers (e.g., 1.2k)
const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
};

const ReelItem = ({ post, isActive }: { post: Post; isActive: boolean }) => {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showFullCaption, setShowFullCaption] = useState(false);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
    const [isLandscape, setIsLandscape] = useState(false);

    const handleLoadedMetadata = (e: SyntheticEvent<HTMLVideoElement, Event>) => {
        const { videoWidth, videoHeight } = e.currentTarget;
        setIsLandscape(videoWidth > videoHeight);
    };

    // Hooks for interactions
    const {
        likesCount = 0,
        isLiked = false,
        toggleLike,
    } = useLikes('post', post.id, post.user_id);

    const { data: comments = [] } = usePostComments(post.id);

    const {
        bookmarks,
        isLoading: bookmarksLoading,
        createBookmark,
        deleteBookmark,
    } = useBookmarks();

    const deletePostMutation = useDeletePost();
    const isBookmarked = bookmarks?.some((b: any) => b.post_id === post.id) || false;
    const isOwnPost = currentUser?.id === post.user_id;

    // Handle video play/pause based on active state
    useEffect(() => {
        if (isActive) {
            videoRef.current?.play().catch(() => {
                // Autoplay might be blocked
                setIsPlaying(false);
            });
            setIsPlaying(true);
        } else {
            videoRef.current?.pause();
            setIsPlaying(false);
        }
    }, [isActive]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleLike = () => {
        if (!currentUser) {
            toast({ title: 'Login required', variant: 'destructive' });
            return;
        }
        toggleLike();
    };

    const handleBookmark = async () => {
        if (!currentUser) {
            toast({ title: 'Login required', variant: 'destructive' });
            return;
        }
        if (isBookmarked) {
            await deleteBookmark.mutateAsync(post.id);
            toast({ title: 'Bookmark removed' });
        } else {
            setShowBookmarkDialog(true);
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}/post/${post.id}`;
        if (navigator.share) {
            navigator.share({
                title: `Reel by @${post.user.username}`,
                url,
            });
        } else {
            navigator.clipboard.writeText(url);
            toast({ title: 'Link copied' });
        }
    };

    const handleDelete = async () => {
        await deletePostMutation.mutateAsync(post.id);
        toast({ title: 'Reel deleted' });
    };

    return (
        <div className="relative w-full h-[calc(100vh-4rem)] md:h-screen snap-center bg-black flex items-center justify-center overflow-hidden">
            {/* Video Background */}
            <div
                className="absolute inset-0 bg-black cursor-pointer"
                onClick={togglePlay}
            >
                <video
                    ref={videoRef}
                    src={post.image_url} // Assuming image_url holds the video URL as per previous logic
                    className="w-full h-full object-contain bg-black"
                    loop
                    playsInline
                    muted={isMuted}
                    poster={post.image_url}
                    onLoadedMetadata={handleLoadedMetadata}
                />
            </div>

            {/* Play/Pause Overlay Indicator */}
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                    <div className="bg-black/50 p-4 rounded-full">
                        <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                </div>
            )}

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />

            {/* Mute Button */}
            <button
                onClick={toggleMute}
                className="absolute top-20 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition md:top-8"
            >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Right Side Actions */}
            <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-10">
                {/* Like */}
                <div className="flex flex-col items-center gap-1">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 hover:bg-black/20"
                        onClick={handleLike}
                    >
                        <Heart
                            className={`w-8 h-8 ${isLiked ? "fill-red-500 text-red-500" : "text-white"}`}
                        />
                    </Button>
                    <span className="text-white text-xs font-medium">{formatCount(likesCount)}</span>
                </div>

                {/* Comment */}
                <div className="flex flex-col items-center gap-1">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 hover:bg-black/20"
                        onClick={() => setShowComments(true)}
                    >
                        <MessageCircle className="w-8 h-8 text-white" />
                    </Button>
                    <span className="text-white text-xs font-medium">{formatCount(comments.length)}</span>
                </div>

                {/* Share */}
                <div className="flex flex-col items-center gap-1">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 hover:bg-black/20"
                        onClick={handleShare}
                    >
                        <Share className="w-8 h-8 text-white" />
                    </Button>
                    <span className="text-white text-xs font-medium">Share</span>
                </div>

                {/* Bookmark */}
                <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full h-12 w-12 hover:bg-black/20"
                    onClick={handleBookmark}
                >
                    <Bookmark
                        className={`w-8 h-8 ${isBookmarked ? "fill-white text-white" : "text-white"}`}
                    />
                </Button>

                {/* More Options */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full h-12 w-12 hover:bg-black/20"
                        >
                            <MoreHorizontal className="w-8 h-8 text-white" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {isOwnPost ? (
                            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                                Delete Reel
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                                Report
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Bottom Info Area */}
            <div className="absolute left-4 bottom-4 right-20 z-10 text-white space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white">
                        <AvatarImage src={post.user.avatar} />
                        <AvatarFallback>{post.user.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm hover:underline cursor-pointer">
                                {post.user.displayName || post.user.username}
                            </span>
                            {post.user_id !== currentUser?.id && (
                                <Button variant="outline" size="sm" className="h-6 text-xs bg-transparent text-white border-white hover:bg-white hover:text-black rounded-lg">
                                    Follow
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Caption */}
                <div className="text-sm">
                    <p className={`${!showFullCaption ? "line-clamp-2" : ""}`}>
                        {post.content}
                    </p>
                    {post.content?.length > 100 && !showFullCaption && (
                        <button
                            onClick={() => setShowFullCaption(true)}
                            className="text-gray-300 text-xs font-semibold mt-1 hover:text-white"
                        >
                            more
                        </button>
                    )}
                </div>

                {/* Music/Audio Tag */}
                <div className="flex items-center gap-2 text-xs bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                    <Music className="w-3 h-3 animate-pulse" />
                    <span>Original Audio • {post.user.username}</span>
                </div>
            </div>

            {/* Modals */}
            {showComments && (
                <UnifiedCommentModal
                    content={post}
                    type="post"
                    onClose={() => setShowComments(false)}
                    isOpen={showComments}
                />
            )}

            <ReportDialog
                isOpen={showReportDialog}
                onClose={() => setShowReportDialog(false)}
                postId={post.id}
                userId={post.user_id}
            />

            <BookmarkFolderDialog
                isOpen={showBookmarkDialog}
                onClose={() => setShowBookmarkDialog(false)}
                postId={post.id}
            />
        </div>
    );
};

const Reelms = () => {
    const { data: posts = [], isLoading } = useAllPosts();

    // Filter for video posts logic
    const videoPosts = posts.filter((post: Post) => {
        return post.image_url && /\.(mp4|webm|mov)$/i.test(post.image_url);
    });

    const [activeReelId, setActiveReelId] = useState<string | null>(null);

    // Intersection Observer to detect active reel
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('data-id');
                        if (id) setActiveReelId(id);
                    }
                });
            },
            { threshold: 0.6 }
        );

        const elements = document.querySelectorAll('.reel-item');
        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [videoPosts.length]);

    // Set initial active reel
    useEffect(() => {
        if (videoPosts.length > 0 && !activeReelId) {
            setActiveReelId(videoPosts[0].id);
        }
    }, [videoPosts, activeReelId]);

    return (
        <div className="min-h-screen bg-black">
            <Navigation />

            <main className="md:ml-72 h-screen overflow-hidden">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : videoPosts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white">
                        <div className="text-6xl mb-4">🎬</div>
                        <h3 className="text-xl font-semibold mb-2">No Reels yet</h3>
                        <p className="text-gray-400">Upload a video to get started!</p>
                    </div>
                ) : (
                    <div className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black">
                        {videoPosts.map((post: Post) => (
                            <div key={post.id} data-id={post.id} className="reel-item snap-start">
                                <ReelItem
                                    post={post}
                                    isActive={activeReelId === post.id}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Reelms;
