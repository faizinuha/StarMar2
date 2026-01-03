import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, X } from 'lucide-react';
import { useState } from 'react';

interface LocationPickerProps {
  value: string;
  onChange: (location: string) => void;
  onEnableChange?: (enabled: boolean) => void;
  enabled?: boolean;
}

// Popular locations
const POPULAR_LOCATIONS = [
  'Jakarta',
  'Surabaya',
  'Bandung',
  'Medan',
  'Semarang',
  'Makassar',
  'Palembang',
  'Yogyakarta',
  'Pekanbaru',
  'Denpasar',
  'Malang',
  'Solo',
];

export const LocationPicker = ({
  value,
  onChange,
  onEnableChange,
  enabled = true,
}: LocationPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLocations = POPULAR_LOCATIONS.filter((location) =>
    location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectLocation = (location: string) => {
    onChange(location);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Location</label>
        {onEnableChange && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onEnableChange(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-xs text-muted-foreground">Enable</span>
          </label>
        )}
      </div>

      <Popover open={isOpen && enabled} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            disabled={!enabled}
          >
            <MapPin className="h-4 w-4" />
            <span className="flex-1 text-left truncate">
              {value || 'Add location...'}
            </span>
            {value && (
              <X
                className="h-4 w-4 hover:text-destructive"
                onClick={handleClear}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" side="bottom" align="start">
          <div className="space-y-3">
            <Input
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm"
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredLocations.length > 0 ? (
                filteredLocations.map((location) => (
                  <button
                    key={location}
                    onClick={() => handleSelectLocation(location)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors text-left text-sm"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{location}</span>
                  </button>
                ))
              ) : searchQuery.trim() ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  Location not found. You can still type and save it.
                </div>
              ) : null}
            </div>
            {searchQuery.trim() && !filteredLocations.includes(searchQuery) && (
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => handleSelectLocation(searchQuery)}
              >
                Add "{searchQuery}" as location
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
