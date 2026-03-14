import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getRecommendations, Track } from '@/lib/api/mymusic';
import { Loader2, Music, Pause, Play, Search, X } from 'lucide-react';

interface MusicPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (track: Track) => void;
  selectedTrack?: Track | null;
}

export const MusicPicker = ({ isOpen, onClose, onSelect, selectedTrack }: MusicPickerProps) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTracks();
    }
    return () => {
      audioRef.current?.pause();
      setPlayingId(null);
    };
  }, [isOpen]);

  const loadTracks = async () => {
    setIsLoading(true);
    try {
      const result = await getRecommendations({ limit: 30 });
      setTracks(result.tracks);
    } catch (err) {
      console.error('Failed to load tracks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTracks = searchQuery
    ? tracks.filter(t =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.artist?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tracks;

  const togglePlay = (track: Track) => {
    if (!track.preview) return;

    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(track.preview);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => setPlayingId(null);
      setPlayingId(track.id);
    }
  };

  const handleSelect = (track: Track) => {
    audioRef.current?.pause();
    setPlayingId(null);
    onSelect(track);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Add Music
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="p-3 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Selected track indicator */}
        {selectedTrack && (
          <div className="px-3 py-2 bg-primary/5 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Music className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-medium truncate">{selectedTrack.name} - {selectedTrack.artist}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { onSelect(null as any); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Track list */}
        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No tracks found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTracks.map((track) => (
                  <div
                    key={track.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedTrack?.id === track.id ? 'bg-primary/10 ring-1 ring-primary/20' : ''
                    }`}
                    onClick={() => handleSelect(track)}
                  >
                    {/* Album art */}
                    <div className="relative h-10 w-10 rounded-md overflow-hidden bg-muted shrink-0">
                      {track.image_url ? (
                        <img src={track.image_url} alt={track.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Music className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>

                    {/* Preview play button */}
                    {track.preview && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(track);
                        }}
                      >
                        {playingId === track.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
