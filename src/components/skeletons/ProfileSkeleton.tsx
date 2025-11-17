import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const ProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="md:ml-72 min-h-screen pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="p-8">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
              {/* Avatar */}
              <div className="relative">
                <Skeleton className="w-32 h-32 rounded-full" />
              </div>

              {/* Profile Info */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <Skeleton className="h-8 w-48" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6">
                  <div className="text-center">
                    <Skeleton className="h-6 w-8 mx-auto mb-1" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="text-center">
                    <Skeleton className="h-6 w-8 mx-auto mb-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="text-center">
                    <Skeleton className="h-6 w-8 mx-auto mb-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>

                {/* Location & Link */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="posts" className="mt-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts">
                <Skeleton className="h-4 w-8 mr-2" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="saved">
                <Skeleton className="h-4 w-8 mr-2" />
                Saved
              </TabsTrigger>
              <TabsTrigger value="tagged">
                <Skeleton className="h-4 w-8 mr-2" />
                Tagged
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-8">
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, i) => (
                  <Skeleton key={i} className="aspect-square w-full" />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="saved" className="mt-8">
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }, (_, i) => (
                  <Skeleton key={i} className="aspect-square w-full" />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="tagged" className="mt-8">
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="aspect-square w-full" />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};