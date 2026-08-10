"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
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
import { ToastAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Search, Loader2, ListFilter, ArrowUpDown, FolderTree } from "lucide-react";

// Helper to provide a stable fallback for Select during hydration
function SelectFallback({ width }: { width: string }) {
  return <div className={cn("h-11 rounded-md border bg-background/50 animate-pulse", width)} />;
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="rounded-lg border bg-card flex flex-col">
            <div className="aspect-square w-full">
                <Skeleton className="h-full w-full rounded-t-lg rounded-b-none" />
            </div>
            <div className="p-3 flex-grow">
                <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="p-3 flex justify-between items-center">
                <Skeleton className="h-6 w-16" />
                <div className="flex items-center">
                  <Skeleton className="h-7 w-7 rounded-full ml-1" />
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
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [deletingProduct, setDeletingProduct] = useState<WooProduct | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const pendingDeletesRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchProducts = useCallback(async (isLoadMore = false) => {
    setIsLoading(true);
    try {
      const currentPage = isLoadMore ? page + 1 : 1;
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
      });

      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);

      // Sorting logic
      if (sortBy === 'recent') {
        params.append('orderby', 'date');
        params.append('order', 'desc');
      } else if (sortBy === 'price_asc') {
        params.append('orderby', 'price');
        params.append('order', 'asc');
      } else if (sortBy === 'price_desc') {
        params.append('orderby', 'price');
        params.append('order', 'desc');
      }

      const response = await fetch(`/api/products?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch products');
      }

      if (isLoadMore) {
        setProducts(prev => [...prev, ...(data.products || [])]);
        setPage(currentPage);
      } else {
        setProducts(data.products || []);
        setPage(1);
      }
      
      setTotalPages(data.totalPages || 1);
      setTotalProducts(data.totalProducts || 0);
    } catch (error: any) {
      console.error("Failed to fetch products:", error);
      if (!isLoadMore) setProducts([]);
      toast({
        title: "Error",
        description: error.message || "Could not load products.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, selectedCategory, searchTerm, sortBy, toast]);

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

  // Initial fetch and fetch on filter change
  useEffect(() => {
    startTransition(() => {
      fetchProducts(false);
    });
  }, [selectedCategory, sortBy, perPage]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        fetchProducts(false);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  }

  const handleSortChange = (value: string) => {
    setSortBy(value);
  }

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    
    const productToProcess = deletingProduct;
    const originalProducts = [...products];

    setProducts(prev => prev.filter(p => p.id !== productToProcess.id));
    const productId = productToProcess.id;
    setDeletingProduct(null);

    const timeoutId = setTimeout(async () => {
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete product.');
            }
            pendingDeletesRef.current.delete(productId);
        } catch (error: any) {
            setProducts(originalProducts);
            toast({
                title: 'Delete Failed',
                description: error.message || 'Could not move product to trash.',
                variant: 'destructive',
            });
        }
    }, 5000);

    pendingDeletesRef.current.set(productId, timeoutId);

    toast({
        title: "Product removed",
        description: `"${productToProcess.name}" is being moved to trash.`,
        action: (
            <ToastAction 
                altText="Recover product" 
                onClick={() => {
                    const timer = pendingDeletesRef.current.get(productId);
                    if (timer) {
                        clearTimeout(timer);
                    }
                    setProducts(originalProducts);
                    pendingDeletesRef.current.delete(productId);
                    toast({ description: "Product restored." });
                }}
            >
                Recover (5s)
            </ToastAction>
        ),
    });
  };

  return (
    <div className="w-full space-y-6">
       <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                  placeholder="Search masterfully crafted furniture..." 
                  className="pl-10 h-11 bg-background/50 backdrop-blur-sm border-primary/10 shadow-sm focus-visible:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {mounted ? (
              <>
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-11 h-11 p-0 flex items-center justify-center bg-background/50 backdrop-blur-sm border-primary/10 shadow-sm transition-colors hover:bg-accent focus:ring-primary [&>span]:hidden [&>svg]:opacity-100">
                    <FolderTree className="h-4 w-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-11 h-11 p-0 flex items-center justify-center bg-background/50 backdrop-blur-sm border-primary/10 shadow-sm transition-colors hover:bg-accent focus:ring-primary [&>span]:hidden [&>svg]:opacity-100">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="recent">Recent Arrivals</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <div className="flex gap-2">
                <SelectFallback width="w-11" />
                <SelectFallback width="w-11" />
              </div>
            )}
          </div>

          <div className="flex justify-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            {totalProducts > 0 && (
                <span>
                    Showing <span className="text-foreground">{products.length}</span> of <span className="text-foreground">{totalProducts}</span> Items
                </span>
            )}
          </div>
       </div>

        {(isLoading && products.length === 0) ? (
            <ProductGridSkeleton />
        ) : products.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} onDelete={setDeletingProduct} />
                ))}
            </div>
        ) : (
            <div className="h-60 flex flex-col items-center justify-center text-center text-muted-foreground col-span-full bg-muted/20 rounded-xl border border-dashed">
                <p className="font-headline text-lg">No matches found.</p>
                <p className="text-sm">Try different keywords or filters.</p>
            </div>
        )}
      
      <div className="flex flex-col items-center gap-4 py-8 border-t border-border/10">
        {isMobile ? (
          <>
            {page < totalPages && (
              <Button 
                onClick={() => fetchProducts(true)} 
                disabled={isLoading}
                variant="outline"
                className="w-full max-w-xs h-11 bg-background/50 backdrop-blur-sm border-primary/20 shadow-md group"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <span className="group-hover:scale-105 transition-transform">Load More Creations</span>
                )}
              </Button>
            )}
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Items {products.length} of {totalProducts}
            </p>
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 text-xs text-muted-foreground font-medium">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPage(p => Math.max(1, p - 1)); fetchProducts(false); }}
                    disabled={page <= 1 || isLoading}
                    className="bg-background/50 h-8 text-xs"
                >
                Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPage(p => Math.min(totalPages, p + 1)); fetchProducts(false); }}
                    disabled={page >= totalPages || isLoading}
                    className="bg-background/50 h-8 text-xs"
                >
                Next
                </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-primary/20 max-w-[90vw] sm:max-w-lg">
            <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-xl">Delete Product?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
                Are you sure you want to delete <strong>{deletingProduct?.name}</strong>? It will be moved to the trash and can be recovered within 5 seconds.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full h-8 text-xs">Keep Product</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className={cn(buttonVariants({ variant: "destructive" }), "rounded-full h-8 text-xs")}>
                Move to Trash
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
