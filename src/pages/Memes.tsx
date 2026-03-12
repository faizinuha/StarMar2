import { useAllMemesWithBadges } from "@/hooks/useMemes";
import { MemeCard } from "@/components/posts/MemeCard";
import { Navigation } from "@/components/layout/Navigation";
import { Loader2, RefreshCw, Search, X, TrendingUp, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatePost } from "@/components/posts/CreatePost";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type SortMode = "latest" | "popular" | "trending";

export const Memes = () => {
  const { data: memes = [], isLoading, refetch } = useAllMemesWithBadges();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("latest");
  const [showSearch, setShowSearch] = useState(false);

  // Filter and sort memes
  const filteredMemes = memes
    .filter((meme) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        meme.caption?.toLowerCase().includes(query) ||
        meme.user.username?.toLowerCase().includes(query) ||
        meme.user.displayName?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === "popular") {
        return (b.likes_count || 0) - (a.likes_count || 0);
      }
      if (sortBy === "trending") {
        // Trending = high engagement in recent time
        const scoreA = ((a.likes_count || 0) + (a.comments_count || 0)) / Math.max(1, (Date.now() - new Date(a.created_at).getTime()) / 3600000);
        const scoreB = ((b.likes_count || 0) + (b.comments_count || 0)) / Math.max(1, (Date.now() - new Date(b.created_at).getTime()) / 3600000);
        return scoreB - scoreA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const sortOptions: { value: SortMode; label: string; icon: typeof Clock }[] = [
    { value: "latest", label: "Terbaru", icon: Clock },
    { value: "popular", label: "Populer", icon: TrendingUp },
    { value: "trending", label: "Trending", icon: Flame },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="md:ml-64 min-h-screen pb-24 sm:pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 space-y-3">
            {/* Title + Actions */}
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold flex items-center gap-2">
                😂 Memes
              </h1>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => refetch()} 
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari meme..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                  autoFocus
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Sort Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {sortOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = sortBy === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${
                      isActive 
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create Post */}
          <div className="mb-4">
            <CreatePost defaultTab="meme" />
          </div>

          {/* Stats Bar */}
          {!isLoading && filteredMemes.length > 0 && (
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs font-normal">
                {filteredMemes.length} meme{filteredMemes.length !== 1 ? 's' : ''}
              </Badge>
              {searchQuery && (
                <span>untuk "{searchQuery}"</span>
              )}
            </div>
          )}

          {/* Memes Feed */}
          <div className="space-y-4">
            {filteredMemes.map((meme) => (
              <MemeCard key={meme.id} meme={meme} />
            ))}

            {isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}

            {filteredMemes.length === 0 && !isLoading && (
              <div className="text-center py-16 space-y-4">
                <div className="text-6xl">😅</div>
                <h3 className="text-xl font-bold">
                  {searchQuery ? "Meme tidak ditemukan" : "Belum ada meme"}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {searchQuery
                    ? `Tidak ada meme yang cocok dengan "${searchQuery}". Coba kata kunci lain.`
                    : "Jadilah yang pertama membagikan meme lucu! 🎉"}
                </p>
                {searchQuery && (
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                    Hapus pencarian
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
