import { Badge as BadgeUI } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LocationInput } from '@/components/ui/location-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useBadges } from '@/hooks/useMemes';
import { useTrendingTags } from '@/hooks/useTags';
import { supabase } from '@/integrations/supabase/client';
import { Image, Laugh, Loader2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EffectsPicker } from './EffectsPicker';
import { UsersTagPicker } from './UsersTagPicker';
import { LocationPicker } from './LocationPicker';
import { applyEffect } from '@/lib/effects';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'post' | 'meme';
}

interface TaggedUser {
  user_id: string;
  username: string;
  displayName: string;
  avatar: string;
}

export const CreatePostModal = ({ isOpen, onClose, defaultTab = 'post' }: CreatePostModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedEffect, setSelectedEffect] = useState<string>();
  const [selectedUsers, setSelectedUsers] = useState<TaggedUser[]>([]);

  const [selectedBadges, setSelectedBadges] = useState<number[]>([]);
  const { data: availableBadges, isLoading: isLoadingBadges } = useBadges();

  const { data: trendingTags = [] } = useTrendingTags(10);
  const [showTagSuggest, setShowTagSuggest] = useState(false);
  const [tagQuery, setTagQuery] = useState('');

  useEffect(() => {
    setFiles([]);
    setPreviews([]);
    setCaption('');
    setLocation('');
    setLocationEnabled(true);
    setSelectedBadges([]);
    setSelectedEffect(undefined);
    setSelectedUsers([]);
  }, [activeTab]);
  
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const filesToProcess =
        activeTab === 'meme'
          ? selectedFiles.slice(0, 1)
          : [...files, ...selectedFiles].slice(0, 10);

      setFiles(filesToProcess);

      const newPreviews = filesToProcess.map((file) =>
        URL.createObjectURL(file)
      );
      setPreviews(newPreviews);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const toggleBadge = (badgeId: number) => {
    setSelectedBadges((prev) =>
      prev.includes(badgeId)
        ? prev.filter((id) => id !== badgeId)
        : [...prev, badgeId]
    );
  };

  const addTaggedUser = (user: TaggedUser) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.user_id === user.user_id);
      if (exists) return prev;
      return [...prev, user];
    });
  };

  const removeTaggedUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.user_id !== userId));
  };

  const handleApplyEffect = async (index: number, effectId: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      applyEffect(effectId, canvas);
      
      // Update preview
      const updatedPreviews = [...previews];
      updatedPreviews[index] = canvas.toDataURL();
      setPreviews(updatedPreviews);
    };
    img.src = previews[index];
  };

  const resetFormAndClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setCaption('');
    setLocation('');
    setLocationEnabled(true);
    setFiles([]);
    setPreviews([]);
    setSelectedBadges([]);
    setSelectedEffect(undefined);
    setSelectedUsers([]);
  };

  const handleSubmit = async () => {
    if (!user || files.length === 0) {
      toast({
        title: 'Please select at least one file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const bucket = activeTab === 'meme' ? 'memes' : 'posts';

      const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${index}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return {
          url: data.publicUrl,
          type: file.type.startsWith('image/') ? 'image' : 'video',
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      if (activeTab === 'meme') {
        const { data: meme, error: memeError } = await supabase
          .from('memes')
          .insert({
            user_id: user.id,
            caption,
            media_url: uploadedFiles[0].url,
            media_type: uploadedFiles[0].type,
          })
          .select('id')
          .single();

        if (memeError) throw memeError;

        if (selectedBadges.length > 0) {
          const memeBadges = selectedBadges.map((badgeId) => ({
            meme_id: meme.id,
            badge_id: badgeId,
          }));
          const { error: badgeError } = await supabase
            .from('meme_badges')
            .insert(memeBadges);
          if (badgeError) console.error('Error adding badges:', badgeError);
        }
      } else {
        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert({ 
            user_id: user.id, 
            caption, 
            location: locationEnabled ? location || null : null,
            likes_count: 0,
            comments_count: 0
          })
          .select('id')
          .single();

        if (postError) throw postError;
        if (!post) {
          throw new Error('Post creation failed. Please try again.');
        }

        const mediaInserts = uploadedFiles.map((file, index) => ({
          post_id: post.id,
          media_url: file.url,
          media_type: file.type,
          order_index: index,
        }));

        const { error: mediaError } = await supabase
          .from('post_media')
          .insert(mediaInserts);
        if (mediaError) throw mediaError;

        // Insert tagged users
        if (selectedUsers.length > 0) {
          const taggedUsersInserts = selectedUsers.map((taggedUser) => ({
            post_id: post.id,
            tagged_user_id: taggedUser.user_id,
          }));
          const { error: tagError } = await supabase
            .from('post_tagged_users')
            .insert(taggedUsersInserts);
          if (tagError) console.error('Error tagging users:', tagError);
        }

        // Handle hashtags client-side
        if (caption) {
          const hashtagRegex = /#(\w+)/g;
          const hashtags = caption.match(hashtagRegex)?.map(tag => tag.substring(1).toLowerCase()) || [];
          const uniqueHashtags = [...new Set(hashtags)];

          if (uniqueHashtags.length > 0) {
            try {
              const upsertedTags = await Promise.all(uniqueHashtags.map(async (tag) => {
                const { data: hashtagData, error: upsertError } = await supabase
                  .from('hashtags')
                  .upsert({ name: tag }, { onConflict: 'name' })
                  .select('id')
                  .single();
                if (upsertError) throw upsertError;
                return hashtagData;
              }));

              const postHashtagRelations = upsertedTags.map(tag => ({
                post_id: post.id,
                hashtag_id: tag.id,
              }));

              const { error: relationError } = await supabase
                .from('post_hashtags')
                .insert(postHashtagRelations);

              if (relationError) throw relationError;

            } catch (e) {
              console.error('Error processing hashtags:', e);
            }
          }
        }
      }

      toast({
        title: `${
          activeTab === 'meme' ? 'Meme' : 'Post'
        } created successfully!`,
      });
      resetFormAndClose();
    } catch (error: any) {
      toast({
        title: 'Error creating content',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'post' | 'meme')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="post" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Post
            </TabsTrigger>
            <TabsTrigger value="meme" className="flex items-center gap-2">
              <Laugh className="h-4 w-4" />
              Meme
            </TabsTrigger>
          </TabsList>

          <TabsContent value="post" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="post-files">Select Images/Videos</Label>
                <input
                  id="post-files"
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {previews.length === 0 ? (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById('post-files')?.click()
                      }
                      className="w-full h-32 border-dashed"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8" />
                        <span>Choose files or drag and drop</span>
                        <span className="text-xs text-muted-foreground">
                          Up to 10 images/videos
                        </span>
                      </div>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2 bg-muted/50 rounded-lg">
                      {previews.map((preview, index) => (
                        <Card key={index} className="relative group">
                          <div className="aspect-square overflow-hidden rounded-md">
                            {files[index]?.type.startsWith('image/') ? (
                              <img
                                src={preview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={preview}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          {files[index]?.type.startsWith('image/') && (
                            <div className="absolute bottom-1 left-1 right-1 flex gap-1">
                              <EffectsPicker
                                selectedEffect={selectedEffect}
                                onSelectEffect={(effectId) => {
                                  setSelectedEffect(effectId);
                                  handleApplyEffect(index, effectId);
                                }}
                              />
                            </div>
                          )}
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Card>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById('post-files')?.click()
                      }
                      className="w-full"
                      disabled={files.length >= 10}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Add more files ({files.length}/10)
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="caption">Caption</Label>
                <div className="relative">
                  <Textarea
                    id="caption"
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => {
                      setCaption(e.target.value);
                      const match = e.target.value.match(/#(\w*)$/);
                      if (match) {
                        setTagQuery(match[1].toLowerCase());
                        setShowTagSuggest(true);
                      } else {
                        setShowTagSuggest(false);
                        setTagQuery('');
                      }
                    }}
                    className="mt-2"
                  />
                  {showTagSuggest && tagQuery.length > 0 && (
                    <div className="absolute left-0 right-0 z-10 bg-white border rounded shadow mt-1 max-h-40 overflow-y-auto">
                      {trendingTags
                        .filter((tag) =>
                          tag.name.toLowerCase().includes(tagQuery)
                        )
                        .map((tag) => (
                          <button
                            key={tag.name}
                            type="button"
                            className="block w-full text-left px-3 py-2 hover:bg-muted"
                            onClick={() => {
                              setCaption((prev) =>
                                prev.replace(/#(\w*)$/, `#${tag.name} `)
                              );
                              setShowTagSuggest(false);
                              setTagQuery('');
                            }}
                          >
                            #{tag.name}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {tag.post_count} posts
                            </span>
                          </button>
                        ))}
                      {trendingTags.filter((tag) =>
                        tag.name.toLowerCase().includes(tagQuery)
                      ).length === 0 && (
                        <div className="px-3 py-2 text-muted-foreground text-xs">
                          No trending hashtag found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <LocationPicker
                  value={location}
                  onChange={setLocation}
                  onEnableChange={setLocationEnabled}
                  enabled={locationEnabled}
                />
              </div>
              <div>
                <Label>Tag Users</Label>
                <UsersTagPicker
                  onSelectUser={addTaggedUser}
                  selectedUsers={selectedUsers}
                  onRemoveUser={removeTaggedUser}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="meme" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="meme-file">Select Meme Image/Video</Label>
                <input
                  id="meme-file"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {previews.length === 0 ? (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById('meme-file')?.click()
                      }
                      className="w-full h-32 border-dashed"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Laugh className="h-8 w-8" />
                        <span>Choose your meme</span>
                        <span className="text-xs text-muted-foreground">
                          Single image or video
                        </span>
                      </div>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2 bg-muted/50 rounded-lg">
                      {previews.map((preview, index) => (
                        <Card key={index} className="relative group">
                          <div className="aspect-square overflow-hidden rounded-md">
                            {files[index]?.type.startsWith('image/') ? (
                              <img
                                src={preview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={preview}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Card>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById('meme-file')?.click()
                      }
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Change file
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="meme-caption">Caption</Label>
                <Textarea
                  id="meme-caption"
                  placeholder="Add a funny caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Badges (Optional)</Label>
                {isLoadingBadges ? (
                  <div className="flex items-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading
                    badges...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availableBadges?.map((badge) => (
                      <BadgeUI
                        key={badge.id}
                        variant={
                          selectedBadges.includes(badge.id)
                            ? 'default'
                            : 'secondary'
                        }
                        onClick={() => toggleBadge(badge.id)}
                        className="cursor-pointer transition-all"
                      >
                        {badge.name}
                      </BadgeUI>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={resetFormAndClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || files.length === 0}
            className="flex-1"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
              </> 
            ) : (
              `Create ${activeTab}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
