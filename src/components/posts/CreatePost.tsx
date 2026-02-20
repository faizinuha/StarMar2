import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { useProfile } from '@/hooks/useProfile';
import { useState } from 'react';
import { SimpleCreatePostModal } from './SimpleCreatePostModal';

interface CreatePostProps {
  defaultTab?: 'post' | 'meme';
}

export const CreatePost = ({ defaultTab = 'post' }: CreatePostProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: userProfile } = useProfile();

  return (
    <>
      <Card className="p-4 animate-fade-in">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={userProfile?.avatar_url || '/assets/Place/cewek.png'}
            />
            <AvatarFallback>
              {userProfile?.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div
            className="flex-1 bg-primary/5 rounded-lg px-4 py-3 text-muted-foreground cursor-pointer hover:bg-primary/10 transition-colors border border-primary/10"
            onClick={() => setIsOpen(true)}
          >
            {defaultTab === 'meme' ? "Share a meme..." : "What's on your mind?"}
          </div>
        </div>
      </Card>
      <SimpleCreatePostModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};
