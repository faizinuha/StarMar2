import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Track } from '@/lib/api/mymusic';

interface MusicContextType {
  isPlaying: boolean;
  currentTrack: Track | null;
  currentTrackId: string | null;
  playTrack: (track: Track, playlist?: Track[]) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrev: () => void;
  duration: number;
  currentTime: number;
  seek: (time: number) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

// Helper function to update media session
const updateMediaSession = (track: Track, playbackHandlers: {
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
}) => {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artist,
      album: track.album_title,
      artwork: [
        { src: track.image_url, sizes: '96x96', type: 'image/jpeg' },
        { src: track.image_url, sizes: '128x128', type: 'image/jpeg' },
        { src: track.image_url, sizes: '192x192', type: 'image/jpeg' },
        { src: track.image_url, sizes: '256x256', type: 'image/jpeg' },
        { src: track.image_url, sizes: '384x384', type: 'image/jpeg' },
        { src: track.image_url, sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.setActionHandler('play', playbackHandlers.play);
    navigator.mediaSession.setActionHandler('pause', playbackHandlers.pause);
    navigator.mediaSession.setActionHandler('nexttrack', playbackHandlers.next);
    navigator.mediaSession.setActionHandler('previoustrack', playbackHandlers.prev);
  }
};

const updatePositionState = (duration: number, currentTime: number) => {
    if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
        navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: 1,
            position: currentTime,
        });
    }
};


export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        audioRef.current = new Audio();
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        updatePositionState(audio.duration, audio.currentTime);
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => playNext();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack]);

  const playTrack = (track: Track, newPlaylist: Track[] = []) => {
    if (newPlaylist.length > 0) {
      setPlaylist(newPlaylist);
    }
    setCurrentTrack(track);
    
    const audio = audioRef.current;
    if (audio) {
      const source = track.preview || track.audio || track.music_url;
      if (source) {
        audio.src = source;
        audio.play().then(() => {
            setIsPlaying(true);
            updateMediaSession(track, {
                play: togglePlayPause,
                pause: togglePlayPause,
                next: playNext,
                prev: playPrev,
            });
        }).catch(e => console.error("Error playing audio:", e));
      }
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    } else {
      if (audio.src) {
        audio.play().then(() => {
            setIsPlaying(true);
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }).catch(e => console.error("Error resuming audio:", e));
      }
    }
  };

  const playNext = () => {
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack?.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    playTrack(playlist[nextIndex]);
  };

  const playPrev = () => {
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack?.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playTrack(playlist[prevIndex]);
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
    }
  };

  return (
    <MusicContext.Provider value={{ 
      isPlaying, 
      currentTrack,
      currentTrackId: currentTrack?.id || null,
      playTrack, 
      togglePlayPause,
      playNext,
      playPrev,
      duration,
      currentTime,
      seek
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
