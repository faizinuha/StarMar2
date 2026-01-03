import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getEffectsList } from '@/lib/effects';
import { Zap } from 'lucide-react';
import { useState } from 'react';

interface EffectsPickerProps {
  onSelectEffect: (effectId: string) => void;
  selectedEffect?: string;
}

export const EffectsPicker = ({ onSelectEffect, selectedEffect }: EffectsPickerProps) => {
  const effects = getEffectsList();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          Effects
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" side="bottom" align="start">
        <div className="grid grid-cols-3 gap-2">
          {effects.map((effect) => (
            <button
              key={effect.id}
              onClick={() => {
                onSelectEffect(effect.id);
                setIsOpen(false);
              }}
              className={`p-2 rounded-lg text-center text-xs font-medium transition-colors ${
                selectedEffect === effect.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              <div className="text-xl mb-1">{effect.icon}</div>
              <div className="truncate">{effect.name}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
