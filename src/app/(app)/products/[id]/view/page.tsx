import { getProduct } from "@/lib/woocommerce-api";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Edit, ExternalLink, Image as ImageIcon } from "lucide-react";
import { WooProduct } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type ProductPageProps = {
  params: { id: string };
};

async function getProductData(id: string): Promise<WooProduct | null> {
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    notFound();
  }
  
  const product = await getProduct(productId);

  if (!product) {
    notFound();
  }

  return product;
}

export async function generateMetadata({ params }: ProductPageProps) {
    const product = await getProductData(params.id);
    return {
        title: product ? `${product.name} | Addis Product AI` : `View Product | Addis Product AI`,
    };
}


export default async function ProductViewPage({ params }: ProductPageProps) {
  const product = await getProductData(params.id);

  if (!product) {
      notFound();
  }

  const yoastMetaDesc = product.meta_data.find(m => m.key === '_yoast_wpseo_metadesc')?.value || '';

  return (
    <div className="container mx-auto py-6 sm:py-10 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-headline">{product.name}</h1>
          <p className="text-muted-foreground mt-1">{product.categories.map(c => c.name).join(', ')}</p>
        </div>
        <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={product.permalink} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                View on Site
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/products/${product.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Product
              </Link>
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12">
        {/* Left Column: Image Carousel */}
        <div>
          <Carousel className="w-full">
            <CarouselContent>
              {product.images.length > 0 ? (
                product.images.map((image, index) => (
                  <CarouselItem key={image.id || index}>
                    <Card className="overflow-hidden">
                       <div className="aspect-square relative">
                        <Image
                            src={image.src}
                            alt={image.alt || product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                       </div>
                    </Card>
                  </CarouselItem>
                ))
              ) : (
                 <CarouselItem>
                    <Card>
                       <div className="aspect-square relative bg-muted flex items-center justify-center">
                            <ImageIcon className="h-24 w-24 text-muted-foreground" />
                       </div>
                    </Card>
                  </CarouselItem>
              )}
            </CarouselContent>
             {product.images.length > 1 && (
                <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                </>
             )}
          </Carousel>
        </div>

        {/* Right Column: Details */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Price</h2>
            <p className="text-3xl font-bold mt-1">{formatCurrency(product.price)}</p>
          </div>
          
          <Separator />

          {product.short_description && (
            <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-2">Summary</h2>
                <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: product.short_description }}
                />
            </div>
          )}
          
          {product.attributes.length > 0 && (
             <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-2">Attributes</h2>
                <div className="flex flex-wrap gap-2">
                    {product.attributes.map(attr => (
                       <Badge key={attr.id} variant="secondary" className="text-sm">
                        <strong>{attr.name}:</strong>&nbsp;{attr.options.join(', ')}
                       </Badge>
                    ))}
                </div>
             </div>
          )}

          {product.tags.length > 0 && (
             <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-2">Tags</h2>
                <div className="flex flex-wrap gap-2">
                    {product.tags.map(tag => (
                       <Badge key={tag.id} variant="outline">{tag.name}</Badge>
                    ))}
                </div>
             </div>
          )}
          
        </div>
      </div>
      
      {/* Full-width Description Section */}
      <div className="mt-10">
         <Separator />
         <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <h2 className="text-xl font-bold font-headline mb-4">Product Description</h2>
                {product.description ? (
                    <div
                        className="prose prose-base dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                ) : (
                    <p className="text-muted-foreground">No description available.</p>
                )}
            </div>
            <div>
                 <h2 className="text-xl font-bold font-headline mb-4">SEO Details</h2>
                 <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Focus Keyphrase</h3>
                            <p className="font-semibold">{product.meta_data.find(m => m.key === '_yoast_wpseo_focuskw')?.value || 'Not set'}</p>
                        </div>
                        {yoastMetaDesc && (
                             <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Meta Description</h3>
                                <p className="text-sm">{yoastMetaDesc}</p>
                            </div>
                        )}
                        
                    </CardContent>
                 </Card>
            </div>
         </div>
      </div>

    </div>
  );
}
