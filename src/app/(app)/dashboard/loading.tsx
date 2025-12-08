import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="rounded-md border">
        <div className="w-full">
          <div className="border-b">
            <div className="flex h-12 items-center px-4">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-6 w-1/4 ml-auto" />
              <Skeleton className="h-6 w-1/4 ml-auto" />
              <Skeleton className="h-6 w-16 ml-auto" />
            </div>
          </div>
          <div>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex h-16 items-center px-4 border-b">
                 <Skeleton className="h-8 w-8 mr-4 rounded-md" />
                 <Skeleton className="h-8 flex-1" />
                 <Skeleton className="h-8 w-1/4 ml-auto" />
                 <Skeleton className="h-8 w-1/4 ml-auto" />
                 <Skeleton className="h-8 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
