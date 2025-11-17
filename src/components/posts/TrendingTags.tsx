import { useTrendingTags } from "@/hooks/useTags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface post_hashtags {
  name?: string;
  limit?: number;
  className?: string;
}

export const TrendingTags = ({ limit = 10, className }: post_hashtags) => {
  const { data: tags = [], isLoading } = useTrendingTags(limit);
  const navigate = useNavigate();

  const handleTagClick = (tag: string) => {
    // Navigate to explore page with tag filter
    navigate(`/explore?tag=${encodeURIComponent(tag)}`);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="h-8 bg-secondary/50 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tags.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Hash className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
             {tags.length === 0 ? 'No trending tags yet. Start creating posts with hashtags!' : ''}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Trending Tags
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tags.map((tag, index) => (
            <div
              key={tag.name}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group"
              onClick={() => handleTagClick(tag.name || '')}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {tag.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tag.post_count} post{tag.post_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {tag.post_count}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};