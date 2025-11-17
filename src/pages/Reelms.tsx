import { useAllPosts } from "@/hooks/useProfile";
import { PostCard } from "@/components/posts/PostCard";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const Reelms = () => {
    const { data: posts = [], isLoading } = useAllPosts();
    const [selectedPost, setSelectedPost] = useState(null);

    // Filter hanya post yang punya media_type video
    const videoPosts = posts.filter((post: any) => {
        // post.image_url = url media pertama (bisa gambar/video),
        // post.post_media[0].media_type = "video" jika video
        // Tapi di useAllPosts, post_media tidak di-include, jadi perlu modifikasi jika ingin info media_type
        // Untuk sekarang, asumsikan image_url video mengandung .mp4/.webm/.mov
        return post.image_url && /\.(mp4|webm|mov)$/i.test(post.image_url);
    });

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h2 className="text-2xl font-bold mb-6">Reelms - Video Posts</h2>
            {isLoading && (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
            {videoPosts.length === 0 && !isLoading && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎬</div>
                    <h3 className="text-lg font-semibold mb-2">No video posts yet</h3>
                    <p className="text-muted-foreground">
                        Be the first to share a video with the community!
                    </p>
                </div>
            )}
            <div className="space-y-8">
                {videoPosts.map((post: any) => (
                    <div key={post.id} className="rounded-lg overflow-hidden bg-card">
                        <div className="aspect-video bg-black flex items-center justify-center">
                            <video
                                src={post.image_url}
                                controls
                                className="w-full h-full object-contain"
                                poster={post.thumbnail_url || undefined}
                            />
                        </div>
                        <PostCard post={post} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Reelms;
