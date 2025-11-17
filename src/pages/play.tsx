import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getRecommendations, Track } from '../lib/api/mymusic';
import { useMusic } from '@/contexts/Music';
import { MusicSkeleton } from '@/components/skeletons/MusicSkeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Navigation } from "@/components/layout/Navigation";

// Komponen untuk menampilkan satu item lagu dalam daftar
const TrackItem = ({ track, onTrackSelect, isCurrent, isPlaying }: { track: Track, onTrackSelect: () => void, isCurrent: boolean, isPlaying: boolean }) => (
  <div
    className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors duration-200 ${isCurrent ? 'bg-green-500 bg-opacity-20' : 'hover:bg-gray-800'}`}
    onClick={onTrackSelect}
  >
    <img src={track.image_url} alt={track.name} className="w-12 h-12 rounded-md mr-4 object-cover" />
    <div className="flex-1 min-w-0">
      <p className={`font-semibold truncate ${isCurrent ? 'text-green-400' : 'text-white'}`}>{track.name}</p>
      <p className="text-sm text-gray-400 truncate">{track.artist}</p>
    </div>
    {isCurrent && isPlaying && (
      <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse ml-3"></div>
    )}
  </div>
);

const SONGS_PER_PAGE = 15;

// Halaman utama pemutar musik
export default function PlayPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [index, setIndex] = useState(0);
  const { playTrack, currentTrackId, isPlaying } = useMusic();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('default');

  const observer = useRef<IntersectionObserver>();
  const lastTrackElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && searchTerm === '') {
        loadMoreTracks();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, searchTerm]);


  const loadMoreTracks = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError(null);
    try {
      const { tracks: newTracks, total } = await getRecommendations({ index: index + SONGS_PER_PAGE, limit: SONGS_PER_PAGE });
      setTracks(prevTracks => [...prevTracks, ...newTracks]);
      setIndex(prevIndex => prevIndex + SONGS_PER_PAGE);
      setHasMore(tracks.length + newTracks.length < total);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat lebih banyak lagu.');
      console.error("Error fetching more recommendations:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [index, loadingMore, hasMore, tracks.length]);

  useEffect(() => {
    const fetchInitialRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        const { tracks: initialTracks, total } = await getRecommendations({ index: 0, limit: SONGS_PER_PAGE });
        setTracks(initialTracks);
        setIndex(0);
        setHasMore(initialTracks.length < total);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat rekomendasi lagu.');
        console.error("Error fetching recommendations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialRecommendations();
  }, []);

  const filteredAndSortedTracks = useMemo(() => {
    return tracks
      .filter(track =>
        track.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortOrder === 'title-asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortOrder === 'artist-asc') {
          return a.artist.localeCompare(b.artist);
        }
        return 0; // 'default' order
      });
  }, [tracks, searchTerm, sortOrder]);


  if (loading) {
    return <MusicSkeleton />;
  }

  return (
    <div className="bg-black min-h-screen text-white p-8 pb-40">
      <header className="mb-8 mt-8">
      {/* <Navigation /> */}
        <h1 className="text-4xl font-bold">Rekomendasi Lagu</h1>
        <p className="text-gray-400">Lagu-lagu pilihan yang mungkin Anda suka.</p>
        <p className="text-gray-400">Mohon Maaf Jika music kami sediakan 30 detik | Update</p>
        
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <Input
            type="text"
            placeholder="Cari lagu atau artis..."
            className="w-full sm:w-72 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-48 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="title-asc">Judul (A-Z)</SelectItem>
              <SelectItem value="artist-asc">Artis (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main>
        {error && !loading && <p className="text-center text-red-500 mt-4">Error: {error}</p>}
        
        <div className="space-y-2">
          {filteredAndSortedTracks.map((track, i) => {
            // The ref for infinite scroll is only attached if there's no search term
            if (filteredAndSortedTracks.length === i + 1 && searchTerm === '') {
              return (
                <div ref={lastTrackElementRef} key={track.id}>
                  <TrackItem
                    track={track}
                    onTrackSelect={() => playTrack(track, tracks)}
                    isCurrent={currentTrackId === track.id}
                    isPlaying={isPlaying}
                  />
                </div>
              );
            } else {
              return (
                <TrackItem
                  key={track.id}
                  track={track}
                  onTrackSelect={() => playTrack(track, tracks)}
                  isCurrent={currentTrackId === track.id}
                  isPlaying={isPlaying}
                />
              );
            }
          })}
        </div>

        {loadingMore && searchTerm === '' && <p className="text-center mt-4 text-gray-400">Memuat lebih banyak...</p>}
        {!hasMore && searchTerm === '' && tracks.length > 0 && <p className="text-center mt-8 text-gray-500">Anda telah mencapai akhir daftar.</p>}
        {filteredAndSortedTracks.length === 0 && !loading && !error && (
            <p className="text-center text-gray-400 mt-8">
                {searchTerm ? 'Lagu tidak ditemukan.' : 'Tidak ada rekomendasi yang ditemukan.'}
            </p>
        )}
      </main>
    </div>
  );
}
