import { Skeleton } from '@/components/ui/skeleton';

export const PostGridSkeleton = () => {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 12 }, (_, i) => (
        <Skeleton 
          key={i} 
          className="aspect-square w-full"
        />
      ))}
    </div>
  );
};