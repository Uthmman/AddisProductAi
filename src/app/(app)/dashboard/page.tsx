import Link from "next/link";
import { LayoutGrid, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductTable from "@/components/product-table";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ProductSuggestions from "@/components/product-suggestions";
import { FloatingAddButton } from "@/components/floating-add-button";

export const metadata = {
  title: "Dashboard | Addis Product AI",
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-8 relative min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-primary/10 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-accent/60 uppercase tracking-widest text-[10px] font-bold">
            <LayoutGrid className="w-3 h-3" />
            <span>Store Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-headline text-foreground">
            Product Catalog
          </h1>
          <p className="text-muted-foreground text-sm max-w-md">
            Manage your masterfully crafted furniture and optimize for the Addis Ababa market.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button asChild id="header-add-button">
            <Link href="/products/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Product
            </Link>
          </Button>
          <ProductSuggestions />
        </div>
      </div>

      <div className="space-y-6">
        <Suspense fallback={<TableSkeleton />}>
          <ProductTable />
        </Suspense>
      </div>

      {/* Floating Action Button - Smart Visibility */}
      <FloatingAddButton observerTargetId="header-add-button" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
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
