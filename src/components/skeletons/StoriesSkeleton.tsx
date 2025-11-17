import { Skeleton } from '@/components/ui/skeleton';

export const StoriesSkeleton = () => {
  return (
    <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex flex-col items-center space-y-2 min-w-[70px]">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
};