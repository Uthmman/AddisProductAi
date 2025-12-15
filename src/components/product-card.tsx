"use client";

import Image from "next/image";
import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WooProduct } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";


type ProductCardProps = {
  product: WooProduct;
  onDelete: (product: WooProduct) => void;
};

export function ProductCard({ product, onDelete }: ProductCardProps) {
  return (
    <Card className="flex flex-col group">
      <Link href={`/products/${product.id}/view`} className="flex flex-col flex-grow">
        <CardHeader className="p-0 border-b">
          <div className="aspect-square relative">
            <Image
              src={product.images?.[0]?.src || "https://picsum.photos/seed/placeholder/300/300"}
              alt={product.images?.[0]?.alt || product.name}
              fill
              className="object-cover rounded-t-lg"
              data-ai-hint="product image"
            />
          </div>
        </CardHeader>
        <CardContent className="p-3 flex-grow">
            <CardTitle className="text-sm sm:text-base font-bold line-clamp-2 group-hover:text-primary transition-colors">{product.name}</CardTitle>
        </CardContent>
      </Link>
      <CardFooter className="p-2 sm:p-3 flex justify-between items-center">
        <p className="text-sm sm:text-base font-semibold text-foreground">
          {formatCurrency(product.price)}
        </p>
        <TooltipProvider>
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" asChild>
                  <Link href={`/products/${product.id}`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Product</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9" onClick={() => onDelete(product)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Product</p>
              </TooltipContent>
            </Tooltip>

          </div>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}
