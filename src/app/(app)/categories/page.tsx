import { Suspense } from 'react';
import CategoryTable from '@/components/category-table';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Categories | Addis Product AI',
};

export default function CategoriesPage() {
  return (
    <div className="container mx-auto py-2 sm:py-4">
      <Suspense fallback={<CategoryTableSkeleton />}>
        <CategoryTable />
      </Suspense>
    </div>
  );
}

function CategoryTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="rounded-md border">
        <div className="w-full">
          <div className="border-b">
            <div className="flex h-10 items-center px-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-1/4 ml-4" />
              <Skeleton className="h-4 w-1/4 ml-auto hidden md:block" />
              <Skeleton className="h-4 w-1/4 ml-auto hidden lg:block" />
              <Skeleton className="h-4 w-12 ml-auto" />
            </div>
          </div>
          <div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex h-12 items-center px-4 border-b">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-5 flex-1 ml-4" />
                 <Skeleton className="h-5 w-1/4 ml-auto hidden md:block" />
                 <Skeleton className="h-5 w-1/4 ml-auto hidden lg:block" />
                <Skeleton className="h-5 w-12 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
