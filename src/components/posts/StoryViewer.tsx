import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Story, useDeleteStory } from "@/hooks/useStories";
import { ChevronLeft, ChevronRight, MoreVertical, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface StoryViewerProps {
  stories: Story[];
  currentStoryIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const StoryViewer = ({
  stories,
  currentStoryIndex,
  isOpen,
  onClose,
  onNext,
  onPrevious,
}: StoryViewerProps) => {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentStory = stories[currentStoryIndex];
  const STORY_DURATION = 5000; // 5 seconds

  const { user } = useAuth();
  const { mutate: deleteStory } = useDeleteStory();
  const { toast } = useToast();

  const isOwnStory = user?.id === currentStory?.user_id;

  useEffect(() => {
    if (!isOpen || !currentStory || isPaused) return;

    // Reset progress when story changes
    // Note: We don't reset progress if it's just paused, handled by dependency check
    // But here we need to know if story CHANGED.
    // simpler: rely on currentStory changing to reset, but we need a ref or effect to reset 
  }, [currentStory, isOpen, isPaused]);

  // Handle Progress and Autoplay
  useEffect(() => {
    if (!isOpen || !currentStory) {
      setProgress(0);
      return;
    }

    if (isPaused) return;

    // If it's a video, let the video duration control the progress if possible, 
    // or just use the timer for images. 
    // For simplicity, we stick to the timer for now, but sync video play/pause.

    if (videoRef.current) {
      if (isPaused) videoRef.current.pause();
      else videoRef.current.play().catch(e => console.log("Autoplay prevented:", e));
    }

    const intervalTime = 100;
    const step = 100 / (STORY_DURATION / intervalTime);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          onNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [currentStory, isOpen, onNext, isPaused]);

  // Reset progress when index changes
  useEffect(() => {
    setProgress(0);
    setIsPaused(false);
  }, [currentStoryIndex]);

  const handleDelete = () => {
    if (!currentStory) return;

    // Confirm delete? For now just delete.
    deleteStory(currentStory.id, {
      onSuccess: () => {
        toast({ title: "Story deleted" });
        onClose();
      },
      onError: () => {
        toast({ title: "Failed to delete story", variant: "destructive" });
      }
    });
  };

  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => setIsPaused(false);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  if (!currentStory) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md h-[90vh] p-0 bg-black border-0 sm:rounded-2xl overflow-hidden">
        <div
          className="relative h-full w-full bg-black flex flex-col"
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Progress bar */}
          <div className="absolute top-4 left-4 right-4 z-50 flex gap-1">
            {/* If we had multiple stories for this specific user, we would map them here. 
                 But currently 'stories' flattens everything. 
                 For now, just one bar for the current global stream story is shown, 
                 or we could try to show context. Keeping it simple as per original code.
             */}
            <div className="flex-1 bg-white/30 rounded-full h-1 overflow-hidden">
              <div
                className="bg-white h-1 rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Header */}
          <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-50 text-white">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border-2 border-white ring-1 ring-black/20">
                <AvatarImage src={currentStory.user.avatar} />
                <AvatarFallback className="text-black bg-white">
                  {currentStory.user.displayName?.[0] || currentStory.user.username?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="drop-shadow-md">
                <p className="font-semibold text-sm">
                  {currentStory.user.displayName || currentStory.user.username}
                </p>
                <p className="text-xs opacity-90">
                  {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Controls */}
              {isOwnStory && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-500 cursor-pointer">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Story
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation(); // prevent pause
                  onClose();
                }}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Story Content */}
          <div className="flex-1 flex items-center justify-center bg-zinc-900 relative">
            {currentStory.media_type.startsWith('image/') ? (
              <img
                src={currentStory.media_url}
                alt="Story"
                className="max-h-full w-full object-contain"
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={currentStory.media_url}
                  autoPlay
                  playsInline
                  muted={isMuted} // Controlled by state
                  className="max-h-full w-full object-contain"
                  onEnded={onNext}
                />
                {/* Mute toggle button absolute over video */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-4 right-4 z-40 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  onClick={toggleMute}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>

          {/* Navigation Tap Zones (Invisible) */}
          <div className="absolute inset-0 flex z-30">
            <div
              className="w-1/3 h-full cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onPrevious(); }}
            />
            <div className="w-1/3 h-full cursor-pointer" onClick={() => {/* Middle does nothing (pauses) */ }} />
            <div
              className="w-1/3 h-full cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onNext(); }}
            />
          </div>

          {/* Side Navigation buttons (visible on hover) */}
          {currentStoryIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-black/20 z-40 hidden sm:flex"
              onClick={(e) => { e.stopPropagation(); onPrevious(); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {currentStoryIndex < stories.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-black/20 z-40 hidden sm:flex"
              onClick={(e) => { e.stopPropagation(); onNext(); }}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};