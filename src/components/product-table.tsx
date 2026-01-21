"use client";

import { useState, useEffect, useTransition } from "react";
import { WooProduct, WooCategory } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "./ui/skeleton";
import { ProductCard } from "./product-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";


function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="rounded-lg border bg-card flex flex-col">
            <div className="aspect-square w-full">
                <Skeleton className="h-full w-full rounded-t-lg rounded-b-none" />
            </div>
            <div className="p-3 flex-grow">
                <Skeleton className="h-5 w-3/4" />
            </div>
            <div className="p-3 flex justify-between items-center">
                <Skeleton className="h-7 w-20" />
                <div className="flex items-center">
                  <Skeleton className="h-7 w-7 rounded-md ml-1" />
                  <Skeleton className="h-7 w-7 rounded-md ml-1" />
                  <Skeleton className="h-7 w-7 rounded-md ml-1" />
                </div>
            </div>
        </div>
      ))}
    </div>
  );
}

export default function ProductTable() {
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [categories, setCategories] = useState<WooCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [deletingProduct, setDeletingProduct] = useState<WooProduct | null>(null);
  const { toast } = useToast();

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const categoryQuery = selectedCategory !== 'all' ? `&category=${selectedCategory}` : '';
      const response = await fetch(`/api/products?page=${page}&per_page=${perPage}${categoryQuery}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch products');
      }

      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
      setTotalProducts(data.totalProducts || 0);
    } catch (error: any) {
      console.error("Failed to fetch products:", error);
      setProducts([]); // Set to empty array on error
      toast({
        title: "Error",
        description: error.message || "Could not load products.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/products/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    startTransition(() => {
      fetchProducts();
    });
  }, [page, selectedCategory, perPage]);

  const handleCategoryChange = (categoryId: string) => {
    setPage(1);
    setSelectedCategory(categoryId);
  }
  
  const handlePerPageChange = (value: string) => {
    setPage(1);
    setPerPage(parseInt(value, 10));
  }

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

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
        const response = await fetch(`/api/products/${deletingProduct.id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete product.');
        }
        toast({
            title: 'Success!',
            description: `Product "${deletingProduct.name}" has been deleted.`,
        });
        fetchProducts(); // Refresh the list
    } catch (error: any) {
        toast({
            title: 'Error',
            description: error.message || 'Could not delete product.',
            variant: 'destructive',
        });
    } finally {
        setDeletingProduct(null);
    }
  };


  return (
    <div className="w-full">
       <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div className="text-sm text-muted-foreground flex-1 hidden sm:block">
             {totalProducts > 0 ? (
                <span>
                    Showing <strong>{products.length}</strong> of <strong>{totalProducts}</strong> products
                </span>
             ) : (
                <span>&nbsp;</span>
             )}
           </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            <Select value={perPage.toString()} onValueChange={handlePerPageChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="12">12 per page</SelectItem>
                <SelectItem value="24">24 per page</SelectItem>
                <SelectItem value="36">36 per page</SelectItem>
                <SelectItem value="48">48 per page</SelectItem>
                </SelectContent>
            </Select>
          </div>
      </div>

        {(isLoading || isPending) ? (
            <ProductGridSkeleton />
        ) : products.length > 0 ? (
             <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} onDelete={setDeletingProduct} />
                ))}
            </div>
        ) : (
            <div className="h-24 flex items-center justify-center text-center text-muted-foreground col-span-full">
                No products found.
            </div>
        )}
      
      <div className="flex items-center justify-between space-x-2 py-4 mt-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </div>
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

      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the <strong>{deletingProduct?.name}</strong> product.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className={buttonVariants({ variant: "destructive" })}>
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
