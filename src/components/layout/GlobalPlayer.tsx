import { useMusic } from '@/contexts/Music';
import { Pause, Play, SkipBack, SkipForward, X, ChevronUp } from 'lucide-react';
import { useState } from 'react';

/**
 * A globally persistent music player component.
 * Renders as a compact bubble by default, expands to full player on click.
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
        seek,
        stopTrack
    } = useMusic();

    const [expanded, setExpanded] = useState(false);

    if (!currentTrack) {
        return null;
    }

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Compact bubble mode
    if (!expanded) {
        return (
            <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2">
                {/* Mini player pill */}
                <div 
                    className="flex items-center gap-2 bg-card/95 backdrop-blur-lg border border-border shadow-xl rounded-full pl-1 pr-3 py-1 cursor-pointer hover:shadow-2xl transition-all"
                    onClick={() => setExpanded(true)}
                >
                    <img 
                        src={currentTrack.image_url} 
                        alt={currentTrack.name} 
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30"
                        style={{ animation: isPlaying ? 'spin 4s linear infinite' : 'none' }}
                    />
                    <div className="hidden sm:block max-w-[120px]">
                        <p className="text-xs font-semibold truncate text-foreground">{currentTrack.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{currentTrack.artist}</p>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); stopTrack(); }}
                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>
        );
    }

    // Expanded player
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl z-50 transition-all">
            {/* Progress bar at top */}
            <div className="w-full h-1 bg-muted cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const pct = x / rect.width;
                seek(pct * duration);
            }}>
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto gap-4">
                {/* Track Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img 
                        src={currentTrack.image_url} 
                        alt={currentTrack.name} 
                        className="w-12 h-12 rounded-lg object-cover shadow-md"
                    />
                    <div className="min-w-0">
                        <p className="font-semibold text-sm truncate text-foreground">{currentTrack.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                    </div>
                </div>
                
                {/* Controls */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-8 text-right hidden sm:block">{formatTime(currentTime)}</span>
                    <button onClick={playPrev} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-foreground">
                        <SkipBack className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={togglePlayPause} 
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button onClick={playNext} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-foreground">
                        <SkipForward className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-muted-foreground w-8 hidden sm:block">{formatTime(duration)}</span>
                </div>

                {/* Collapse & Close */}
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setExpanded(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
                        title="Minimize"
                    >
                        <ChevronUp className="w-4 h-4 rotate-180" />
                    </button>
                    <button
                        onClick={stopTrack}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
