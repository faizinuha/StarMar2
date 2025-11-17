import { Skeleton } from '@/components/ui/skeleton';

export const NavigationSkeleton = () => {
  return (
    <>
      {/* Desktop Navigation Skeleton */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-72 bg-card border-r border-border p-6 flex-col justify-between z-40">
        <div className="space-y-8">
          {/* Logo Skeleton */}
          <div className="flex items-center space-x-3">
            <Skeleton className="w-10 h-10 rounded-md" />
            <Skeleton className="h-8 w-24" />
          </div>

          {/* Navigation Items Skeleton */}
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center space-x-3 h-12 px-4">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* User Profile Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3 h-12 px-4">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-4 w-16" />
          </div>
          
          <div className="flex items-center space-x-3 p-3 rounded-2xl bg-secondary">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Skeleton */}
      <div className="md:hidden">
        {/* Top Bar Skeleton */}
        <header className="fixed top-0 left-0 right-0 bg-card border-b border-border p-4 flex items-center justify-between z-50">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-8 h-8 rounded-md" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-md" />
        </header>

        {/* Bottom Navigation Skeleton */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 flex justify-around z-40">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-12 rounded-md" />
          ))}
        </nav>
      </div>

      {/* Spacers */}
      <div className="hidden md:block w-72" />
      <div className="md:hidden h-16" />
      <div className="md:hidden h-16" />
    </>
  );
};