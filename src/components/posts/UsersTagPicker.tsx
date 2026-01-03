import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAllProfiles } from '@/hooks/useAllProfiles';
import { Loader2, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TaggedUser {
  user_id: string;
  username: string;
  displayName: string;
  avatar: string;
}

interface UsersTagPickerProps {
  onSelectUser: (user: TaggedUser) => void;
  selectedUsers: TaggedUser[];
  onRemoveUser: (userId: string) => void;
}

export const UsersTagPicker = ({
  onSelectUser,
  selectedUsers,
  onRemoveUser,
}: UsersTagPickerProps) => {
  const { data: allUsers = [], isLoading } = useAllProfiles();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = allUsers.filter(
        (user: any) =>
          (user.username?.toLowerCase().includes(query) ||
            user.display_name?.toLowerCase().includes(query)) &&
          !selectedUsers.some((selected) => selected.user_id === user.user_id)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [searchQuery, allUsers, selectedUsers]);

  const handleSelectUser = (user: any) => {
    onSelectUser({
      user_id: user.user_id,
      username: user.username,
      displayName: user.display_name || user.username,
      avatar: user.avatar_url,
    });
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Tag Users
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" side="bottom" align="start">
          <div className="space-y-3">
            <Input
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm"
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <button
                    key={user.user_id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors text-left text-sm"
                  >
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {user.display_name || user.username}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        @{user.username}
                      </div>
                    </div>
                  </button>
                ))
              ) : searchQuery.trim() ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No users found
                </div>
              ) : null}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <div
              key={user.user_id}
              className="flex items-center gap-2 bg-primary/10 border border-primary rounded-full px-3 py-1 text-sm"
            >
              <img
                src={user.avatar}
                alt={user.username}
                className="h-5 w-5 rounded-full object-cover"
              />
              <span className="font-medium">@{user.username}</span>
              <button
                onClick={() => onRemoveUser(user.user_id)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
