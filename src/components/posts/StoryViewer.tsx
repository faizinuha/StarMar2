import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Story } from "@/hooks/useStories";

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
  const currentStory = stories[currentStoryIndex];
  const STORY_DURATION = 5000; // 5 seconds

  useEffect(() => {
    if (!isOpen || !currentStory) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          onNext();
          return 0;
        }
        return prev + (100 / (STORY_DURATION / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentStory, isOpen, onNext]);

  if (!currentStory) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[80vh] p-0 bg-black border-0">
        <div className="relative h-full w-full rounded-lg overflow-hidden">
          {/* Progress bar */}
          <div className="absolute top-4 left-4 right-4 z-20">
            <div className="w-full bg-white/30 rounded-full h-1">
              <div
                className="bg-white h-1 rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Header */}
          <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20 text-white">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border-2 border-white">
                <AvatarImage src={currentStory.user.avatar} />
                <AvatarFallback className="text-black">
                  {currentStory.user.displayName?.[0] || currentStory.user.username?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">
                  {currentStory.user.displayName || currentStory.user.username}
                </p>
                <p className="text-xs opacity-75">
                  {new Date(currentStory.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Story Content */}
          <div className="h-full w-full flex items-center justify-center">
            {currentStory.media_type.startsWith('image/') ? (
              <img
                src={currentStory.media_url}
                alt="Story"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <video
                src={currentStory.media_url}
                autoPlay
                muted
                className="max-h-full max-w-full object-contain"
                onEnded={onNext}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="absolute inset-0 flex">
            <div
              className="flex-1 cursor-pointer"
              onClick={onPrevious}
            />
            <div
              className="flex-1 cursor-pointer"
              onClick={onNext}
            />
          </div>

          {/* Navigation buttons (visible on hover) */}
          {currentStoryIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 opacity-0 hover:opacity-100 transition-opacity"
              onClick={onPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {currentStoryIndex < stories.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 opacity-0 hover:opacity-100 transition-opacity"
              onClick={onNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};