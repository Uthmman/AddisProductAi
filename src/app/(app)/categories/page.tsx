import { Suspense } from 'react';
import CategoryTable from '@/components/category-table';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Categories | Addis Product AI',
};

export default function CategoriesPage() {
  return (
    <div className="container mx-auto py-10">
      <Suspense fallback={<CategoryTableSkeleton />}>
        <CategoryTable />
      </Suspense>
    </div>
  );
}

function CategoryTableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
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
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex h-16 items-center px-4 border-b">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-1/4 ml-auto" />
                <Skeleton className="h-8 w-1/4 ml-auto" />
                <Skeleton className="h-8 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
