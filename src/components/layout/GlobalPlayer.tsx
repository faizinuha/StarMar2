import { useMusic } from '@/contexts/Music';

/**
 * A globally persistent music player component.
 * It renders only when there is a track currently active in the MusicContext.
 */
export const GlobalPlayer = () => {
    const { 
        isPlaying, 
        togglePlayPause, 
        currentTrack, 
        playNext, 
        playPrev, 
        duration, 
        currentTime, 
        seek 
    } = useMusic();

    // If there's no active track, render nothing.
    if (!currentTrack) {
        return null;
    }

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 bg-opacity-90 backdrop-blur-md p-4 text-white border-t border-gray-700 z-50">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                {/* Track Info */}
                <div className="flex items-center w-1/4 min-w-0">
                    <img src={currentTrack.image_url} alt={currentTrack.name} className="w-14 h-14 rounded-md mr-4 object-cover" />
                    <div className="min-w-0">
                        <p className="font-semibold truncate">{currentTrack.name}</p>
                        <p className="text-sm text-gray-400 truncate">{currentTrack.artist}</p>
                    </div>
                </div>
                
                {/* Player Controls */}
                <div className="flex flex-col items-center w-1/2">
                    <div className="flex items-center gap-4">
                        <button onClick={playPrev} className="text-gray-400 hover:text-white text-2xl transition-colors">⏮️</button>
                        <button onClick={togglePlayPause} className="bg-white text-black rounded-full w-10 h-10 flex items-center justify-center text-3xl transform hover:scale-105 transition-transform">
                            {isPlaying ? '⏸️' : '▶️'}
                        </button>
                        <button onClick={playNext} className="text-gray-400 hover:text-white text-2xl transition-colors">⏭️</button>
                    </div>
                    <div className="flex items-center gap-2 w-full mt-2">
                        <span className="text-xs w-12 text-center">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={(e) => seek(Number(e.target.value))}
                            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                        <span className="text-xs w-12 text-center">{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Placeholder for other controls like volume */}
                <div className="w-1/4">
                </div>
            </div>
        </div>
    );
};
