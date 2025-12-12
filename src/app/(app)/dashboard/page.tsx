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
    <div className="container mx-auto py-6 sm:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Products</h1>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
       {[...Array(12)].map((_, i) => (
        <div key={i} className="rounded-lg border bg-card flex flex-col">
            <div className="aspect-square w-full">
                <Skeleton className="h-full w-full rounded-t-lg rounded-b-none" />
            </div>
            <div className="p-4 flex-grow">
                <Skeleton className="h-6 w-3/4" />
            </div>
            <div className="p-4 flex justify-between items-center">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        </div>
      ))}
    </div>
  );
}
