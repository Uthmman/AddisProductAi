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

  const fetchProducts = useCallback(async (isLoadMore = false, overridePage?: number) => {
    setIsLoading(true);
    try {
      const currentPage = overridePage ?? (isLoadMore ? page + 1 : 1);
      
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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'The server returned an unexpected error.' }));
        throw new Error(errorData.message || `Failed to fetch products (Status: ${response.status})`);
      }

      const data = await response.json();

      if (isLoadMore) {
        setProducts(prev => [...prev, ...(data.products || [])]);
        setPage(currentPage);
      } else {
        setProducts(data.products || []);
        setPage(currentPage);
      }
      
      setTotalPages(data.totalPages || 1);
      setTotalProducts(data.totalProducts || 0);
    } catch (error: any) {
      console.error("Failed to fetch products:", error);
      if (!isLoadMore) setProducts([]);
      toast({
        title: "Connection Error",
        description: error.message || "Could not load products. Please check your connection or backend settings.",
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

  const handlePriceChange = useCallback((productId: number, newPrice: string) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, price: newPrice, regular_price: newPrice } : p));
  }, []);

  return (
    <div className="w-full space-y-8">
       {/* Search & Filter Bar - Sticky */}
       <div className="sticky top-0 sm:top-2 z-40 pb-4 -mx-2 px-2 bg-background/50 backdrop-blur-md transition-all">
          <div className="flex items-center gap-0 w-full max-w-3xl mx-auto rounded-xl border border-primary/20 bg-background/80 backdrop-blur-xl shadow-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 transition-all">
            
            {/* Category Left */}
            {mounted ? (
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-14 h-14 border-none rounded-none bg-transparent hover:bg-primary/5 transition-colors focus:ring-0 [&>span]:hidden [&>svg]:hidden">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <FolderTree className="h-5 w-5 text-accent" />
                  </div>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="w-14 h-14 bg-muted/20 animate-pulse" />
            )}

            {/* Search Input */}
            <div className="relative flex-1 group">
              <Input 
                  placeholder="Find unique furniture designs..." 
                  className="pl-12 h-14 border-none rounded-none bg-transparent focus-visible:ring-0 text-base font-medium placeholder:text-muted-foreground/60"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors z-20 pointer-events-none" />
            </div>
            
            {/* Sort Right */}
            {mounted ? (
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-14 h-14 border-none rounded-none bg-transparent hover:bg-primary/5 transition-colors focus:ring-0 [&>span]:hidden [&>svg]:hidden border-l border-primary/10">
                   <div className="flex flex-col items-center justify-center gap-1">
                    <ArrowUpDown className="h-5 w-5 text-accent" />
                  </div>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="recent">Recent Arrivals</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="w-14 h-14 bg-muted/20 animate-pulse border-l border-primary/10" />
            )}
          </div>
       </div>

        {/* Product Grid */}
        <div className="pt-2">
            {/* Top Count Badge */}
            <div className="flex justify-center mb-6">
                <div className="text-[10px] font-bold uppercase tracking-widest text-accent/60 bg-accent/5 px-4 py-1.5 rounded-full">
                    {products.length} of {totalProducts} Products
                </div>
            </div>

            {(isLoading && products.length === 0) ? (
                <ProductGridSkeleton />
            ) : products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} onDelete={setDeletingProduct} onPriceChange={handlePriceChange} />
                    ))}
                </div>
            ) : (
                <div className="h-80 flex flex-col items-center justify-center text-center p-12 bg-muted/10 rounded-2xl border border-dashed border-primary/20">
                    <div className="bg-muted p-4 rounded-full mb-4">
                        <Search className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="font-headline text-2xl text-foreground mb-2">No masterworks found</p>
                    <p className="text-muted-foreground text-sm max-w-xs">We couldn't find any products matching your search or category filter. Try clearing your filters.</p>
                    <Button variant="link" onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }} className="mt-4">
                        Clear all filters
                    </Button>
                </div>
            )}
        </div>
      
      {/* Footer / Pagination */}
      <div className="flex flex-col items-center gap-4 py-8 border-t border-primary/5 mt-8">
        <div className="flex flex-col items-center gap-4 w-full">
            {/* Counter */}
            <div className="text-[10px] font-bold uppercase tracking-widest text-accent/60 bg-accent/5 px-4 py-1.5 rounded-full">
                {products.length} of {totalProducts} Products
            </div>

            {isMobile ? (
            <>
                {page < totalPages && (
                <Button 
                    onClick={() => fetchProducts(true)} 
                    disabled={isLoading}
                    variant="outline"
                    className="w-full max-w-xs h-12 bg-background border-primary/30 shadow-xl group hover:bg-primary hover:text-primary-foreground transition-all rounded-xl font-bold"
                >
                    {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <span className="group-hover:scale-105 transition-transform">Explore More Creations</span>
                    )}
                </Button>
                )}
            </>
            ) : (
            <div className="flex items-center justify-center w-full">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { 
                          const newPage = Math.max(1, page - 1);
                          setPage(newPage);
                          fetchProducts(false, newPage);
                        }}
                        disabled={page <= 1 || isLoading}
                        className="bg-background h-10 px-5 border-primary/10 rounded-lg hover:border-primary transition-colors"
                    >
                    Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { 
                          const newPage = Math.min(totalPages, page + 1);
                          setPage(newPage);
                          fetchProducts(false, newPage);
                        }}
                        disabled={page >= totalPages || isLoading}
                        className="bg-background h-10 px-5 border-primary/10 rounded-lg hover:border-primary transition-colors"
                    >
                    Next
                    </Button>
                </div>
            </div>
            )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-2xl border-primary/20 max-w-[90vw] sm:max-w-lg shadow-2xl rounded-2xl">
            <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-2xl text-accent">Move to Archive?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                You are about to remove <strong>{deletingProduct?.name}</strong> from the active catalog. You will have 5 seconds to undo this action.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:gap-0">
            <AlertDialogCancel className="rounded-xl h-11 px-6 border-primary/20 font-bold">Keep Creation</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className={cn(buttonVariants({ variant: "destructive" }), "rounded-xl h-11 px-6 font-bold shadow-lg shadow-destructive/20")}>
                Archive Now
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
