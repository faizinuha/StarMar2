import { useAllMemesWithBadges } from "@/hooks/useMemes";
import { MemeCard } from "@/components/posts/MemeCard";
import { Navigation } from "@/components/layout/Navigation";
import { TrendingTags } from "@/components/posts/TrendingTags";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Memes = () => {
  const { data: memes = [], isLoading, refetch } = useAllMemesWithBadges();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="md:ml-72 min-h-screen pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Hero Section */}
          <Card className="mb-8 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 border-primary/20">
            <CardContent className="p-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-3 flex items-center gap-3">
                    <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                    Galeri Memes
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-2xl">
                    Temukan dan bagikan meme terbaik dari komunitas! Beri lencana pada favorit Anda 🏆
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => refetch()} 
                  disabled={isLoading}
                  className="bg-background/50 backdrop-blur-sm hover:bg-background/80"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Memes Feed */}
            <div className="lg:col-span-2 space-y-6">
              {memes.map((meme) => (
                <MemeCard key={meme.id} meme={meme} />
              ))}

              {isLoading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              )}

              {memes.length === 0 && !isLoading && (
                <Card className="border-dashed">
                  <CardContent className="text-center py-16">
                    <div className="text-8xl mb-6">😅</div>
                    <h3 className="text-2xl font-bold mb-3">Belum Ada Meme</h3>
                    <p className="text-muted-foreground text-lg mb-6">
                      Jadilah yang pertama membagikan meme lucu!
                    </p>
                    <Button size="lg" className="animate-pulse">
                      Upload Meme Pertama
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <TrendingTags limit={10} />
              
              {/* Stats Card */}
              <Card className="bg-gradient-to-br from-accent/10 to-primary/10">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    📊 Statistik
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Memes</span>
                      <span className="font-bold text-xl">{memes.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Likes</span>
                      <span className="font-bold text-xl">
                        {memes.reduce((sum, m) => sum + (m.likes_count || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Komentar</span>
                      <span className="font-bold text-xl">
                        {memes.reduce((sum, m) => sum + (m.comments_count || 0), 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};