import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function ProductViewLoading() {
  return (
    <div className="container mx-auto py-6 sm:py-10 max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-1/4" />
        </div>
        <Skeleton className="h-10 w-24 ml-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Image Carousel */}
        <div>
          <Skeleton className="aspect-square w-full rounded-lg" />
           <div className="flex gap-2 mt-4 justify-center">
                <Skeleton className="w-16 h-16 rounded-md" />
                <Skeleton className="w-16 h-16 rounded-md" />
                <Skeleton className="w-16 h-16 rounded-md" />
            </div>
        </div>

        {/* Right Column: Details */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-10 w-40" />
          </div>
          
          <Separator />

          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>

          <div className="space-y-4">
             <Skeleton className="h-5 w-20" />
             <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
             </div>
          </div>
          
           <div className="space-y-4">
             <Skeleton className="h-5 w-20" />
             <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
