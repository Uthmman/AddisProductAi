"use client";

import { useState, useEffect, useTransition } from "react";
import { WooProduct } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "./ui/skeleton";
import { ProductCard } from "./product-card";

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[...Array(6)].map((_, i) => (
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

export default function ProductTable() {
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/products?page=${page}&per_page=6`);
        const data = await response.json();
        setProducts(data.products);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    startTransition(() => {
      fetchProducts();
    });
  }, [page]);

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };


  return (
    <div className="w-full">
        {(isLoading || isPending) ? (
            <ProductGridSkeleton />
        ) : products.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        ) : (
            <div className="h-24 flex items-center justify-center text-center text-muted-foreground">
                No products found.
            </div>
        )}
      
      <div className="flex items-center justify-end space-x-2 py-4 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousPage}
          disabled={page <= 1 || isLoading || isPending}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={page >= totalPages || isLoading || isPending}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
