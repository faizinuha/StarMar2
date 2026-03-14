import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from 'react-use';

interface Gif {
  id: string;
  title: string;
  url: string;
  preview: string;
  width: string;
  height: string;
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const CATEGORIES = ['trending', 'funny', 'reaction', 'love', 'sad', 'happy', 'angry', 'cat', 'dog'];

export const GifPicker = ({ onSelect, onClose }: GifPickerProps) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const LIMIT = 50;

  useDebounce(
    () => {
      setDebouncedQuery(query);
      setOffset(0);
      setGifs([]);
      setHasMore(true);
    },
    400,
    [query]
  );

  useEffect(() => {
    fetchGifs(debouncedQuery, 0, false);
  }, [debouncedQuery]);

  const fetchGifs = async (searchQuery: string, currentOffset: number, append: boolean) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('giphy-search', {
        body: { query: searchQuery || 'trending', limit: LIMIT, offset: currentOffset },
      });

      if (error) throw error;
      const newGifs = data.gifs || [];
      
      if (append) {
        setGifs(prev => [...prev, ...newGifs]);
      } else {
        setGifs(newGifs);
      }
      
      setHasMore(newGifs.length >= LIMIT);
    } catch (error) {
      console.error('Error fetching GIFs:', error);
      if (!append) setGifs([]);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = () => {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    fetchGifs(debouncedQuery, newOffset, true);
  };

  const handleSelect = (gifUrl: string) => {
    onSelect(gifUrl);
    onClose();
  };

  const handleCategoryClick = (cat: string) => {
    setQuery(cat === 'trending' ? '' : cat);
  };

  return (
    <div className="bg-card border rounded-lg shadow-lg w-96 max-h-[500px] flex flex-col">
      {/* Search Header */}
      <div className="p-3 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search GIFs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        {/* Category chips */}
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap capitalize transition-colors ${
                (cat === 'trending' && !query) || query === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Powered by GIPHY
        </p>
      </div>

      {/* GIF Grid */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : gifs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No GIFs found
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleSelect(gif.url)}
                    className="relative overflow-hidden rounded-md hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <img
                      src={gif.preview}
                      alt={gif.title}
                      className="w-full h-20 object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="text-xs"
                  >
                    {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
