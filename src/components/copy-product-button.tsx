"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WooProduct } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface CopyProductButtonProps {
  product: WooProduct;
}

export default function CopyProductButton({ product }: CopyProductButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const stripHtml = (html: string) => {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, "").trim();
  };

  const handleCopy = async () => {
    try {
      const yoastFocusKw = product.meta_data.find(m => m.key === '_yoast_wpseo_focuskw')?.value || 'Not set';
      const yoastMetaDesc = product.meta_data.find(m => m.key === '_yoast_wpseo_metadesc')?.value || 'Not set';
      const amharicName = product.meta_data.find(m => m.key === 'amharic_name')?.value || '';

      const content = [
        `Product: ${product.name}`,
        amharicName ? `Amharic Name: ${amharicName}` : null,
        `SKU: ${product.sku}`,
        `Price: ${formatCurrency(product.price)}`,
        `Category: ${product.categories.map(c => c.name).join(", ")}`,
        `Tags: ${product.tags.map(t => t.name).join(", ")}`,
        `\nSummary:\n${stripHtml(product.short_description)}`,
        `\nDescription:\n${stripHtml(product.description)}`,
        `\nAttributes:`,
        ...product.attributes.map(attr => `- ${attr.name}: ${attr.options.join(", ")}`),
        `\nSEO Details:`,
        `- Focus Keyphrase: ${yoastFocusKw}`,
        `- Meta Description: ${yoastMetaDesc}`,
        `\nPermalink: ${product.permalink}`
      ].filter(Boolean).join("\n");

      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      toast({ description: "Product details copied to clipboard!" });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
      toast({ variant: "destructive", description: "Failed to copy content." });
    }
  };

  return (
    <Button variant="outline" onClick={handleCopy}>
      {isCopied ? (
        <Check className="mr-2 h-4 w-4 text-green-600" />
      ) : (
        <Copy className="mr-2 h-4 w-4" />
      )}
      Copy Content
    </Button>
  );
}
