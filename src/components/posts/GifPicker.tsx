import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export const GifPicker = ({ onSelect, onClose }: GifPickerProps) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Debounce search query
  useDebounce(
    () => {
      setDebouncedQuery(query);
    },
    500,
    [query]
  );

  useEffect(() => {
    fetchGifs(debouncedQuery);
  }, [debouncedQuery]);

  const fetchGifs = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('giphy-search', {
        body: { query: searchQuery, limit: 30 },
      });

      if (error) throw error;
      setGifs(data.gifs || []);
    } catch (error) {
      console.error('Error fetching GIFs:', error);
      setGifs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (gifUrl: string) => {
    onSelect(gifUrl);
    onClose();
  };

  return (
    <div className="bg-card border rounded-lg shadow-lg w-80 max-h-96 flex flex-col">
      {/* Search Header */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari GIF..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Powered by GIPHY
        </p>
      </div>

      {/* GIF Grid */}
      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {query ? 'Tidak ada GIF ditemukan' : 'Mulai ketik untuk mencari GIF'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => handleSelect(gif.url)}
                className="relative overflow-hidden rounded-md hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <img
                  src={gif.preview}
                  alt={gif.title}
                  className="w-full h-24 object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
