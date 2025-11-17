
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/hooks/useProfile';

// Function to fetch followers or following
const fetchFollowList = async (userId: string, type: 'followers' | 'following') => {
  if (!userId) return [];

  // Step 1: Get the list of relevant user IDs from the 'follows' table.
  const targetColumn = type === 'followers' ? 'follower_id' : 'following_id';
  const filterColumn = type === 'followers' ? 'following_id' : 'follower_id';

  const { data: follows, error: followsError } = await supabase
    .from('followers')
    .select(targetColumn)
    .eq(filterColumn, userId);

  if (followsError) {
    console.error(`Error fetching ${type} IDs:`, followsError);
    throw followsError;
  }

  if (!follows || follows.length === 0) {
    return [];
  }

  const userIds = follows.map(f => f[targetColumn]);

  // Step 2: Get the profiles for the collected user IDs.
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, avatar_url')
    .in('user_id', userIds);

  if (profilesError) {
    console.error(`Error fetching ${type} profiles:`, profilesError);
    throw profilesError;
  }

  return profiles as Partial<Profile>[];
};


export const FollowListModal = ({
  isOpen,
  onClose,
  userId,
  type,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['followList', userId, type],
    queryFn: () => fetchFollowList(userId, type),
    enabled: isOpen && !!userId,
  });

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="capitalize">{type}</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between">
                  <Link to={`/profile/${user.user_id}`} onClick={onClose} className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user.display_name}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
