import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Mock location suggestions - in real app, this would come from a geocoding API
const mockLocations = [
  "Jakarta, Indonesia",
  "Bali, Indonesia", 
  "Bandung, Indonesia",
  "Surabaya, Indonesia",
  "Yogyakarta, Indonesia",
  "Medan, Indonesia",
  "Semarang, Indonesia",
  "Makassar, Indonesia",
  "Palembang, Indonesia",
  "Denpasar, Bali",
  "Ubud, Bali",
  "Canggu, Bali",
  "Seminyak, Bali",
  "Sanur, Bali",
];

export const LocationInput = ({ value, onChange, placeholder = "Add location...", className }: LocationInputProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filteredLocations, setFilteredLocations] = useState(mockLocations);

  useEffect(() => {
    if (search) {
      const filtered = mockLocations.filter(location =>
        location.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredLocations(filtered);
    } else {
      setFilteredLocations(mockLocations);
    }
  }, [search]);

  const handleSelect = (location: string) => {
    onChange(location);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className={`relative ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setSearch(e.target.value);
                setOpen(true);
              }}
              placeholder={placeholder}
              className="pl-10 pr-10"
              onFocus={() => setOpen(true)}
            />
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search locations..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No locations found.</CommandEmpty>
              <CommandGroup>
                {filteredLocations.slice(0, 8).map((location) => (
                  <CommandItem
                    key={location}
                    onSelect={() => handleSelect(location)}
                    className="cursor-pointer"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {location}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};