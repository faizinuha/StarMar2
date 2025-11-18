import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useBookmarkFolders } from '@/hooks/useBookmarkFolders';
import { useBookmarks } from '@/hooks/useBookmarks';
import { Folder, Plus } from 'lucide-react';

interface BookmarkFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export const BookmarkFolderDialog = ({
  isOpen,
  onClose,
  postId,
}: BookmarkFolderDialogProps) => {
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const { folders, createFolder } = useBookmarkFolders();
  const { createBookmark } = useBookmarks();

  const handleSave = async () => {
    let folderId = selectedFolder;

    if (showNewFolder && newFolderName) {
      const result = await createFolder.mutateAsync(newFolderName);
      folderId = result.id;
    }

    createBookmark.mutate(
      { postId, folderId },
      {
        onSuccess: () => {
          onClose();
          setNewFolderName('');
          setShowNewFolder(false);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save to Folder</DialogTitle>
          <DialogDescription>
            Choose a folder to save this post.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!showNewFolder ? (
            <>
              <RadioGroup value={selectedFolder} onValueChange={setSelectedFolder}>
                {folders.map((folder) => (
                  <div key={folder.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={folder.id} id={folder.id} />
                    <Label
                      htmlFor={folder.id}
                      className="flex items-center gap-2 font-normal cursor-pointer"
                    >
                      <Folder className="h-4 w-4" />
                      {folder.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowNewFolder(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Folder
              </Button>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="folderName">New Folder Name</Label>
              <Input
                id="folderName"
                placeholder="Enter folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <Button
                variant="ghost"
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              (!selectedFolder && !newFolderName) ||
              createBookmark.isPending ||
              createFolder.isPending
            }
          >
            {createBookmark.isPending || createFolder.isPending
              ? 'Saving...'
              : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
