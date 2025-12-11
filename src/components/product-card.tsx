"use client";

import Image from "next/image";
import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WooProduct } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type ProductCardProps = {
  product: WooProduct;
  onDelete: (product: WooProduct) => void;
};

export function ProductCard({ product, onDelete }: ProductCardProps) {
  return (
    <Card className="flex flex-col">
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
        <CardTitle className="text-base font-bold line-clamp-2">{product.name}</CardTitle>
      </CardContent>
      <CardFooter className="p-3 flex justify-between items-center">
        <p className="text-base font-semibold text-foreground">
          {formatCurrency(product.price)}
        </p>
        <div>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/products/${product.id}`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
           <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(product)}>
              <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
