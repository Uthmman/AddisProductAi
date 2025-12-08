import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductTable from "@/components/product-table";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Dashboard | Addis Product AI",
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-headline">Products</h1>
        <Button asChild>
          <Link href="/products/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Product
          </Link>
        </Button>
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <ProductTable />
      </Suspense>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="w-full">
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
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex h-16 items-center px-4 border-b">
                 <Skeleton className="h-8 w-1/4" />
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
  )
}
