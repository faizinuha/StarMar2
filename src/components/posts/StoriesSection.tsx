import { useAuth } from "@/contexts/AuthContext";
import { useOptimizedStories } from "@/hooks/useOptimizedStories";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateStoryModal } from "./CreateStoryModal";
import { StoryViewer } from "./StoryViewer";

export const StoriesSection = () => {
  const { user } = useAuth();
  const { data: stories = [] } = useOptimizedStories();
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Group stories by user and get the latest story for each user
  const storyGroups = stories.reduce((groups: any, story) => {
    if (!groups[story.user_id]) {
      groups[story.user_id] = {
        user: story.user,
        stories: [],
        latestStory: story,
      };
    }
    groups[story.user_id].stories.push(story);
    return groups;
  }, {});

  const userStoryGroups = Object.values(storyGroups);

  const handleStoryClick = (storyGroupIndex: number) => {
    // Find the total index of the first story in this group
    let totalIndex = 0;
    for (let i = 0; i < storyGroupIndex; i++) {
      totalIndex += (userStoryGroups[i] as any).stories.length;
    }
    setSelectedStoryIndex(totalIndex);
  };

  const handleNext = () => {
    if (selectedStoryIndex !== null && selectedStoryIndex < stories.length - 1) {
      setSelectedStoryIndex(selectedStoryIndex + 1);
    } else {
      setSelectedStoryIndex(null);
    }
  };

  const handlePrevious = () => {
    if (selectedStoryIndex !== null && selectedStoryIndex > 0) {
      setSelectedStoryIndex(selectedStoryIndex - 1);
    }
  };

  return (
    <>
      <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
        {/* Add Story Button */}
        {user && (
          <div
            className="flex-shrink-0 cursor-pointer group"
            onClick={() => setShowCreateModal(true)}
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-primary/50 flex items-center justify-center group-hover:border-primary transition-colors">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <span className="block text-xs text-center mt-2 font-medium">Your Story</span>
            </div>
          </div>
        )}

        {/* Story Groups */}
        {userStoryGroups.map((group: any, index) => (
          <div
            key={group.user.id}
            className="flex-shrink-0 cursor-pointer group"
            onClick={() => handleStoryClick(index)}
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 group-hover:border-primary transition-colors">
                {group.latestStory.media_type?.startsWith('video') ? (
                  <video
                    src={group.latestStory.media_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={group.latestStory.media_url}
                    className="w-full h-full object-cover"
                    alt="Story"
                  />
                )}
              </div>
              {group.stories.length > 1 && (
                <div className="absolute -bottom-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {group.stories.length}
                </div>
              )}
            </div>
            <span className="block text-xs text-center mt-2 font-medium truncate w-16">
              {group.user.displayName || group.user.username}
            </span>
          </div>
        ))}

        {/* Empty State */}
        {userStoryGroups.length === 0 && !user && (
          <div className="flex-shrink-0 opacity-50">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
              <span className="text-2xl">📖</span>
            </div>
            <span className="block text-xs text-center mt-2 font-medium">No Stories</span>
          </div>
        )}
      </div>

      {/* Story Viewer */}
      {selectedStoryIndex !== null && (
        <StoryViewer
          stories={stories}
          currentStoryIndex={selectedStoryIndex}
          isOpen={selectedStoryIndex !== null}
          onClose={() => setSelectedStoryIndex(null)}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
};
