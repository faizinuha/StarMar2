import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { getSocialIcon, getSocialColor } from '@/components/ui/icons/SocialIcons';

export interface SocialLink {
  platform: string;
  url: string;
}

interface SocialLinksEditorProps {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
  maxLinks?: number;
}

const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username' },
  { value: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/username' },
  { value: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/username' },
  { value: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@username' },
  { value: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@channel' },
  { value: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
  { value: 'github', label: 'GitHub', placeholder: 'https://github.com/username' },
  { value: 'discord', label: 'Discord', placeholder: 'discord.gg/invite' },
  { value: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/user/...' },
  { value: 'twitch', label: 'Twitch', placeholder: 'https://twitch.tv/username' },
  { value: 'website', label: 'Website', placeholder: 'https://yourwebsite.com' },
  { value: 'other', label: 'Other', placeholder: 'https://...' },
];

export const SocialLinksEditor = ({ links, onChange, maxLinks = 6 }: SocialLinksEditorProps) => {
  const [localLinks, setLocalLinks] = useState<SocialLink[]>(links || []);

  useEffect(() => {
    setLocalLinks(links || []);
  }, [links]);

  const handleAddLink = () => {
    if (localLinks.length >= maxLinks) return;
    const newLinks = [...localLinks, { platform: 'instagram', url: '' }];
    setLocalLinks(newLinks);
    onChange(newLinks);
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = localLinks.filter((_, i) => i !== index);
    setLocalLinks(newLinks);
    onChange(newLinks);
  };

  const handlePlatformChange = (index: number, platform: string) => {
    const newLinks = localLinks.map((link, i) =>
      i === index ? { ...link, platform } : link
    );
    setLocalLinks(newLinks);
    onChange(newLinks);
  };

  const handleUrlChange = (index: number, url: string) => {
    const newLinks = localLinks.map((link, i) =>
      i === index ? { ...link, url } : link
    );
    setLocalLinks(newLinks);
    onChange(newLinks);
  };

  const getPlatformInfo = (platform: string) => {
    return SOCIAL_PLATFORMS.find((p) => p.value === platform) || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Social Media Links</Label>
        <span className="text-xs text-muted-foreground">
          {localLinks.length}/{maxLinks} links
        </span>
      </div>

      {localLinks.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          No social links added yet. Add up to {maxLinks} links to share your social media.
        </p>
      )}

      <div className="space-y-3">
        {localLinks.map((link, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select
              value={link.platform}
              onValueChange={(value) => handlePlatformChange(index, value)}
            >
              <SelectTrigger className="w-[160px]">
                <div className="flex items-center gap-2">
                  <span className={getSocialColor(link.platform)}>
                    {getSocialIcon(link.platform, 'h-4 w-4')}
                  </span>
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {SOCIAL_PLATFORMS.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    <div className="flex items-center gap-2">
                      <span className={getSocialColor(platform.value)}>
                        {getSocialIcon(platform.value, 'h-4 w-4')}
                      </span>
                      {platform.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={link.url}
              onChange={(e) => handleUrlChange(index, e.target.value)}
              placeholder={getPlatformInfo(link.platform).placeholder}
              className="flex-1"
            />

            {link.url && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="h-9 w-9"
              >
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveLink(index)}
              className="h-9 w-9 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {localLinks.length < maxLinks && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddLink}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Social Link
        </Button>
      )}
    </div>
  );
};
