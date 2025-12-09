import { useAllMemesWithBadges } from "@/hooks/useMemes";
import { MemeCard } from "@/components/posts/MemeCard";
import { Navigation } from "@/components/layout/Navigation";
import { Loader2, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatePost } from "@/components/posts/CreatePost";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Memes = () => {
  const { data: memes = [], isLoading, refetch } = useAllMemesWithBadges();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
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
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="md:ml-72 min-h-screen pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Header with Search and Filter */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                {showSearch ? (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search memes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSearch(true)}
                    >
                      <Search className="h-5 w-5" />
                    </Button>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as "latest" | "popular")}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="latest">Latest</SelectItem>
                        <SelectItem value="popular">Popular</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => refetch()} 
                disabled={isLoading}
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Create Post */}
          <div className="mb-4">
            <CreatePost defaultTab="meme" />
          </div>

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
              <div className="text-center py-16">
                <div className="text-6xl mb-4">😅</div>
                <h3 className="text-xl font-bold mb-2">
                  {searchQuery ? "No memes found" : "No memes yet"}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term"
                    : "Be the first to share a meme!"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
