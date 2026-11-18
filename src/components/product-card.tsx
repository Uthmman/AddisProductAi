"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Edit, Trash2, MessageSquare, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WooProduct } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "./ui/input";
import { useToast } from "@/hooks/use-toast";

type ProductCardProps = {
  product: WooProduct;
  onDelete: (product: WooProduct) => void;
  onPriceChange?: (productId: number, newPrice: string) => void;
};

export function ProductCard({ product, onDelete, onPriceChange }: ProductCardProps) {
  const { toast } = useToast();
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [price, setPrice] = useState(product.regular_price || product.price);
  const [isSaving, setIsSaving] = useState(false);

  const handleSavePrice = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    const previousPrice = product.regular_price || product.price;
    if (price === previousPrice) {
        setIsEditingPrice(false);
        return;
    }

    const targetPrice = price;
    // Optimistic UI update: immediately close edit mode and reflect price in state
    setIsEditingPrice(false);
    product.regular_price = targetPrice;
    product.price = targetPrice;
    onPriceChange?.(product.id, targetPrice);

    setIsSaving(true);
    try {
        const response = await fetch(`/api/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ regular_price: targetPrice }),
        });

        if (!response.ok) throw new Error("Failed to update price");
        
        toast({ description: "Price updated successfully." });
    } catch (error: any) {
        // Rollback on failure
        setPrice(previousPrice);
        product.regular_price = previousPrice;
        product.price = previousPrice;
        onPriceChange?.(product.id, previousPrice);
        toast({ variant: "destructive", title: "Update Failed", description: `${error.message}. Price reverted.` });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Card className="flex flex-col group overflow-hidden border border-border/40 sm:border-none shadow-sm sm:shadow-md hover:shadow-xl transition-all duration-300 bg-card/60 backdrop-blur-sm rounded-xl sm:rounded-2xl active:scale-[0.99]">
      <Link href={`/products/${product.id}/view`} className="flex flex-col flex-grow">
        <CardHeader className="p-0 border-b border-border/10">
          <div className="aspect-square relative overflow-hidden bg-muted/20">
            <Image
              src={product.images?.[0]?.src || "https://picsum.photos/seed/placeholder/300/300"}
              alt={product.images?.[0]?.alt || product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              data-ai-hint="product image"
              sizes="(max-width: 768px) 50vw, 25vw"
              loading="lazy"
            />
            {product.status === 'draft' && (
              <Badge variant="secondary" className="absolute top-2 left-2 z-10 backdrop-blur-md bg-background/80 border-none shadow-sm text-[10px] font-bold px-1.5 py-0.5">Draft</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-2.5 sm:p-3 flex-grow">
            <CardTitle className="text-xs sm:text-base font-bold line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                {product.name}
            </CardTitle>
        </CardContent>
      </Link>
      
      <CardFooter className="p-2.5 sm:p-3 pt-0 flex flex-col items-start gap-1.5 sm:gap-2">
        <div className="w-full flex items-center justify-between">
            {isEditingPrice ? (
                <div className="flex items-center gap-1 w-full animate-in fade-in slide-in-from-bottom-1 duration-200">
                    <Input 
                        value={price} 
                        onChange={(e) => setPrice(e.target.value)}
                        className="h-8 text-xs font-bold w-full bg-background"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleSavePrice} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/5" onClick={(e) => { e.stopPropagation(); setIsEditingPrice(false); setPrice(product.regular_price); }} disabled={isSaving}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditingPrice(true); }}
                    className="text-xs sm:text-base font-bold text-accent hover:text-primary transition-colors py-0.5 px-1 -ml-1 rounded hover:bg-accent/5"
                    title="Click to edit price directly"
                >
                    {formatCurrency(price)}
                </button>
            )}
        </div>

        <div className="w-full flex justify-end gap-1 mt-0.5 border-t border-border/10 pt-1.5 sm:pt-2">
          <TooltipProvider>
            <div className="flex items-center gap-0.5">
                <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-9 sm:w-9 rounded-full hover:bg-primary/10" asChild>
                    <Link href={`/products/${product.id}`}>
                        <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Link>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Edit Details</p>
                </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-9 sm:w-9 rounded-full hover:bg-primary/10" asChild>
                    <Link href={`/bot?editProductId=${product.id}`}>
                        <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Link>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>AI Chat Edit</p>
                </TooltipContent>
                </Tooltip>

                <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-9 sm:w-9 rounded-full text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(product)}>
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Delete</p>
                </TooltipContent>
                </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
}
