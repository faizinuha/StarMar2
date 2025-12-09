import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useState } from 'react';
import { CreatePostModal } from './CreatePostModal';

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
              src={userProfile?.avatar_url || '/assets/placeholder/cewek.png'}
            />
            <AvatarFallback>
              {userProfile?.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div 
            className="flex-1 bg-secondary rounded-full px-4 py-3 text-muted-foreground cursor-pointer hover:bg-secondary/80 transition-colors"
            onClick={() => setIsOpen(true)}
          >
            {defaultTab === 'meme' ? "Share a meme..." : "What's on your mind?"}
          </div>
        </div>
      </Card>
      <CreatePostModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        defaultTab={defaultTab}
      />
    </>
  );
};
