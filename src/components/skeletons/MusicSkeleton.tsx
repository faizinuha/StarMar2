import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for a single music track item in the list.
 */
const MusicListItemSkeleton = () => (
  <div className="flex items-center p-2 rounded-lg">
    <Skeleton className="w-12 h-12 rounded-md mr-4" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

/**
 * Skeleton for the main music recommendation page (`play.tsx`).
 * It mimics the page's structure during the initial loading state.
 */
export const MusicSkeleton = () => {
  return (
    <div className="bg-black min-h-screen text-white p-8 pb-40">
      <header className="mb-8">
        <Skeleton className="h-10 w-1/2 mb-3" />
        <Skeleton className="h-5 w-1/3" />
      </header>

      <main className="space-y-2">
        {/* Render multiple list item skeletons to represent a list */}
        {Array.from({ length: 10 }).map((_, i) => (
          <MusicListItemSkeleton key={i} />
        ))}
      </main>
    </div>
  );
};